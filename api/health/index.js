const { Client } = require("pg");
const { beginRequest, endRequest, failRequest, withRequestId } = require("../_shared/observability");

const DB_CONNECT_TIMEOUT_MS = 3000;
const DB_QUERY_TIMEOUT_MS = 3000;

module.exports = async function(context, req) {
  const obs = beginRequest(context, req, "health.get");
  const databaseUrl = process.env.DATABASE_URL;

  const baseBody = {
    ok: true,
    service: "me-api",
    timestamp: new Date().toISOString(),
    checks: {
      database: "not_configured"
    }
  };

  if (!databaseUrl) {
    context.res = {
      status: 200,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: baseBody
    };
    endRequest(context, obs, 200, { dbCheck: "not_configured" });
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS
  });

  try {
    await client.connect();
    await client.query("SELECT 1");

    context.res = {
      status: 200,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: {
        ...baseBody,
        checks: {
          database: "ok"
        }
      }
    };
    endRequest(context, obs, 200, { dbCheck: "ok" });
  } catch (error) {
    failRequest(context, obs, error, 503);
    context.res = {
      status: 503,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: {
        ok: false,
        service: "me-api",
        timestamp: new Date().toISOString(),
        checks: {
          database: "error"
        },
        error: "Health check failed"
      }
    };
  } finally {
    await client.end().catch(() => {});
  }
};
