/**
 * @fileoverview Cache reporting endpoints.
 * @module api/cache-report/index.js
 */

const { Client } = require('../db');
const auth = require('../_shared/auth');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 15000;

function getDbClient() {
  const databaseUrl = process.env.AZURE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('AZURE_DATABASE_URL is not configured');
  }

  return new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function requireAuth(req) {
  // Use the platform-provided client principal (x-ms-client-principal).
  const principal = auth.getClientPrincipal(req);
  if (principal && principal.email) return principal;
  return null;
}

/**
 * Cache report endpoint. Requires admin role and returns cached AI responses.
 *
 * @param {Object} context
 * @param {Object} req
 */
module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'cacheReport');
  const auth = requireAuth(req);
  if (!auth) {
    context.res = {
      status: 401,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'Unauthorized' },
    };
    endRequest(context, obs, 401);
    return;
  }

  // Require an admin role for this endpoint. Roles are provided by the
  // `x-ms-client-principal` claims as `userRoles` and returned via
  // `getClientPrincipal()` as `roles`.
  const roles = Array.isArray(auth.roles) ? auth.roles.map((r) => String(r).toLowerCase()) : [];
  const isAdmin =
    roles.includes('admin') ||
    roles.includes('administrator') ||
    roles.includes('owner') ||
    roles.includes('authenticated');
  if (!isAdmin) {
    context.res = {
      status: 403,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'Forbidden' },
    };
    endRequest(context, obs, 403);
    return;
  }

  const client = getDbClient();
  await client.connect();
  try {
    const result =
      await client.queryWithRetry(`SELECT question, model, cache_hit_count, last_accessed, is_cached, invalidated_at
 		 FROM ai_response_cache
 		 ORDER BY last_accessed DESC`);

    const mappedRows = result.rows.map((row) => ({
      question: row.question,
      model: row.model,
      cached: row.cache_hit_count,
      lastAccessed: row.last_accessed,
      invalidatedAt: row.invalidated_at || null,
      hidden: !row.is_cached,
    }));

    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: mappedRows,
    };
    endRequest(context, obs, 200);
  } catch (error) {
    failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: error.message || 'Cache report error' },
    };
  } finally {
    await client.end().catch(() => {});
  }
};
