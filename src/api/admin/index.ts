import { Client } from "pg";
import * as auth from "../_shared/auth";
import * as observability from "../_shared/observability";

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 15000;

/**
 * Converts a value to a trimmed string or null if empty.
 * @param {any} value
 * @returns {string|null}
 */
function asText(value: any) {
  if (value === null || value === undefined) {
    return null;
  }
  const t = String(value).trim();
  return t === "" ? null : t;
}

/**
 * Converts a value to an array of trimmed strings.
 * @param {any} value
 * @returns {string[]}
 */
function asArray(value: any) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (item === null || item === undefined ? "" : String(item).trim()))
    .filter(Boolean);
}

/**
 * Converts a value to a date string or null.
 * @param {any} value
 * @returns {string|null}
 */
function asDate(value: any) {
  const t = asText(value);
  return t || null;
}

/**
 * Converts a value to a number or null.
 * @param {any} value
 * @returns {number|null}
 */
function asNumber(value: any) {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "") {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Returns a new PostgreSQL client instance.
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
 * Returns the authenticated principal or null.
 * @param {object} req
 * @returns {object|null}
 */
function requireAuth(req: any) {
  const principal = auth.getClientPrincipal(req);
  if (principal && principal.email) {
    return principal;
  }
  return null;
}

/**
 * Maps input to a gap type string.
 * @param {string} input
 * @returns {string}
 */
function mapGapType(input: any) {
  const value = String(input || "").toLowerCase();
  if (value === "skill gap" || value === "skill") return "skill";
  if (value === "experience gap" || value === "experience") return "experience";
  if (value === "environment mismatch" || value === "environment") return "environment";
  if (value === "role type mismatch" || value === "role_type") return "role_type";
  return "skill";
}

/**
 * Maps input to an instruction type string.
 * @param {string} input
 * @returns {string}
 */
function mapInstructionType(input: any) {
  const value = String(input || "").toLowerCase();
  if (value === "tone") return "tone";
  if (value === "boundaries") return "boundaries";
  return "honesty";
}

/**
 * Maps input to a skill category string.
 * @param {string} input
 * @returns {string}
 */
function mapSkillCategory(input: any) {
  const value = String(input || "").toLowerCase();
  if (value === "strong") return "strong";
  if (value === "moderate") return "moderate";
  if (value === "gap") return "gap";
  return "strong";
}

/**
 * Resolves a candidate by email or creates a new one.
 * @param {import('pg').Client} client
 * @param {string} email
 * @param {object} profile
 * @returns {Promise<number>}
 */
async function resolveCandidate(client: any, email: any, profile: any) {
  const existing = await client.query(
    `SELECT id
     FROM candidate_profile
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO candidate_profile (name, email)
     VALUES ($1, $2)
     RETURNING id`,
    [asText(profile.fullName) || email.split("@")[0], email]
  );

  return inserted.rows[0].id;
}

/**
 * Loads all profile-related data for a candidate.
 * @param {import('pg').Client} client
 * @param {number} candidateId
 * @returns {Promise<object>}
 */
async function loadAll(client: any, candidateId: any) {
  // Minimal implementation: load candidate profile
  const profileRes = await client.query(
    `SELECT * FROM candidate_profile WHERE id = $1`,
    [candidateId]
  );
  const profile = profileRes.rows[0] || null;
  // You can expand this to join/load related tables as needed
  return { profile };
}

/**
 * Saves all profile-related data for a candidate.
 * @param {import('pg').Client} client
 * @param {number} candidateId
 * @param {object} body
 * @param {string} email
 * @returns {Promise<void>}
 */
async function saveAll(client: any, candidateId: any, body: any, email: any) {
  // Minimal implementation: update candidate profile name if provided
  if (body && body.profile && body.profile.fullName) {
    await client.query(
      `UPDATE candidate_profile SET name = $1, updated_at = NOW() WHERE id = $2`,
      [body.profile.fullName, candidateId]
    );
  }
  // You can expand this to update related tables as needed
}

/**
 * Azure Function entry point for admin panel operations.
 * @param {any} context - Azure Functions context object.
 * @param {any} req - HTTP request object.
 * @returns {Promise<void>}
 */
module.exports = async function(context: any, req: any) {
  const obs = observability.beginRequest(context, req, "admin.panel");
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

  let client;
  try {
    client = getDbClient();
    await client.connect();

    const candidateId = await resolveCandidate(client, String(user.email).toLowerCase(), req.body && req.body.profile ? req.body.profile : {});

    if (String(req.method || "").toUpperCase() === "GET") {
      const data = await loadAll(client, candidateId);
      context.res = {
        status: 200,
        headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
        body: data
      };
      observability.endRequest(context, obs, 200);
      return;
    }

    if (String(req.method || "").toUpperCase() === "POST") {
        await saveAll(client, candidateId, req.body || {}, String(user.email).toLowerCase());
        // Invalidate AI cache after profile updates that affect generated responses
        try {
          if (module.exports && typeof module.exports.hideCacheRecords === "function") {
            await module.exports.hideCacheRecords(client);
          }
        } catch (err) {
          // don't fail the save because cache invalidation failed; log and continue
        }
      context.res = {
        status: 200,
        headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
        body: { ok: true }
      };
      observability.endRequest(context, obs, 200);
      return;
    }

    context.res = {
      status: 405,
      headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: { error: "Method not allowed" }
    };
    observability.endRequest(context, obs, 405);
  } catch (error) {
    observability.failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: { error: (error as any).message || "Admin operation failed" }
    };
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
};

// Cache report endpoint
module.exports.cacheReport = async function(context: any, req: any) {
  const obs = observability.beginRequest(context, req, "admin.cacheReport");
  const auth = requireAuth(req);
  if (!auth) {
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
      // Map DB fields to frontend keys
      const mappedRows = result.rows.map((row: any) => ({
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
      body: { error: (error as any).message || "Cache report error" }
    };
  } finally {
    await client.end();
  }
};

module.exports.hideCacheRecords = async function(client: any) {
  await client.query(`UPDATE ai_response_cache SET is_cached = FALSE, invalidated_at = NOW() WHERE is_cached = TRUE`);
};
