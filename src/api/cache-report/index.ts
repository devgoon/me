import { Client } from "pg";
import * as auth from "../_shared/auth";
import * as observability from "../_shared/observability";

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 15000;

/**
 * Creates and returns a new PostgreSQL client instance.
 * @returns {import('pg').Client}
 */
function getDbClient() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not configured");
	}

	return new Client({
		connectionString: databaseUrl,
		ssl: { rejectUnauthorized: false },
		connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
		query_timeout: DB_QUERY_TIMEOUT_MS,
		statement_timeout: DB_QUERY_TIMEOUT_MS
	});
}

/**
 * Checks authentication and returns principal if valid.
 * @param {object} req - The HTTP request object.
 * @returns {object|null}
 */
function requireAuth(req) {
	const principal = auth.getClientPrincipal(req);
	if (principal && principal.email) {
		return principal;
	}
	return null;
}

module.exports = async function(context, req) {
	const obs = observability.beginRequest(context, req, "cacheReport");
	const user = requireAuth(req);
	if (!user) {
		context.res = {
			status: 401,
			headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
			body: { error: "Unauthorized" }
		};
		observability.endRequest(context, obs, 401);
		return;
	}

	const client = getDbClient();
	await client.connect();
	try {
		const result = await client.query(
			`SELECT question, model, cache_hit_count, last_accessed, is_cached, invalidated_at
			 FROM ai_response_cache
			 ORDER BY cache_hit_count DESC, last_accessed DESC`
		);

		const mappedRows = result.rows.map(row => ({
			question: row.question,
			model: row.model,
			cached: row.cache_hit_count,
			lastAccessed: row.last_accessed,
			invalidatedAt: row.invalidated_at || null,
			hidden: !row.is_cached
		}));

		context.res = {
			status: 200,
			headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
			body: mappedRows
		};
		observability.endRequest(context, obs, 200);
	} catch (error) {
		observability.failRequest(context, obs, error, 500);
		context.res = {
			status: 500,
			headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
			body: { error: error.message || "Cache report error" }
		};
	} finally {
		await client.end().catch(() => {});
	}
};
