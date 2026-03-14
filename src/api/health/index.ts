import { Client } from "pg";
import * as observability from "../_shared/observability";

const DB_CONNECT_TIMEOUT_MS = 3000;
const DB_QUERY_TIMEOUT_MS = 3000;
const API_TIMEOUT_MS = 3000;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Returns an AbortSignal with a timeout.
 * @param {number} ms - Timeout in milliseconds.
 * @returns {{ signal: AbortSignal, clear: () => void }}
 */
function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

/**
 * @typedef {object} HealthBody
 * @property {boolean} ok
 * @property {string} service
 * @property {string} timestamp
 * @property {object} checks
 * @property {object} checks.env
 * @property {string} checks.env.databaseUrl
 * @property {string} checks.env.anthropicKey
 * @property {string} checks.env.aiModel
 * @property {string} checks.database
 * @property {string} checks.anthropic
 * @property {string} [dbError]
 * @property {any} [anthropicBody]
 * @property {string} [anthropicError]
 */

/**
 * Azure Function entry point for health check endpoint.
 * @param {any} context - Azure Functions context object.
 * @param {any} req - HTTP request object.
 * @returns {Promise<void>}
 */
module.exports = async function(context: any, req: any) {
  const obs = observability.beginRequest(context, req, "health.get");
  const databaseUrl = process.env.DATABASE_URL;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const aiModel = process.env.AI_MODEL;

  const baseBody: {
    ok: boolean;
    service: string;
    timestamp: string;
    checks: {
      env: {
        databaseUrl: string;
        anthropicKey: string;
        aiModel: string;
      };
      database: string;
      anthropic: string;
    };
    dbError?: string;
    anthropicBody?: unknown;
    anthropicError?: string;
  } = {
    ok: true,
    service: "me-api",
    timestamp: new Date().toISOString(),
    checks: {
      env: {
        databaseUrl: databaseUrl ? "ok" : "not_configured",
        anthropicKey: anthropicKey ? "ok" : "not_configured",
        aiModel: aiModel ? "ok" : "not_configured"
      },
      database: "unknown",
      anthropic: "unknown"
    }
  };

  // DB check
  if (databaseUrl) {
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
      baseBody.checks.database = "ok";
    } catch (error: any) {
      baseBody.checks.database = "error";
      baseBody.ok = false;
      baseBody.dbError = error && error.message ? error.message : String(error);
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    baseBody.checks.database = "not_configured";
  }

  // Anthropic check
  if (anthropicKey) {
    const t = timeoutSignal(API_TIMEOUT_MS);
    try {
      const res = await fetch(ANTHROPIC_API_URL, {
        method: "GET",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": ANTHROPIC_VERSION,
          "Content-Type": "application/json"
        },
        signal: t.signal
      });
      if (res.ok) {
          let data: any = null;
          try {
            data = await res.json();
          } catch (e) {
            // non-json response
          }

          // If an AI model is specified, confirm it exists in the Anthropic models list
          if (aiModel && data) {
            let models: string[] = [];
            if (Array.isArray(data.models)) {
              models = data.models.map((m: any) => (m && m.id ? String(m.id) : (m && m.name ? String(m.name) : String(m))).trim());
            } else if (Array.isArray(data)) {
              models = data.map((m: any) => (m && m.id ? String(m.id) : (m && m.name ? String(m.name) : String(m))).trim());
            } else if (Array.isArray(data.data)) {
              models = data.data.map((m: any) => (m && m.id ? String(m.id) : (m && m.name ? String(m.name) : String(m))).trim());
            }
            const found = models.length > 0 && (models.includes(aiModel) || models.map((s: string) => s.toLowerCase()).includes(String(aiModel).toLowerCase()));
            if (!found) {
              baseBody.checks.anthropic = `model_not_found:${aiModel}`;
              baseBody.ok = false;
              baseBody.anthropicBody = data;
            } else {
              baseBody.checks.anthropic = "ok";
            }
          } else {
            baseBody.checks.anthropic = "ok";
          }
        } else {
          baseBody.checks.anthropic = `error:${res.status}`;
          baseBody.ok = false;
          try {
            baseBody.anthropicBody = await res.text();
          } catch (_e) {}
        }
    } catch (error: any) {
      baseBody.checks.anthropic = "error";
      baseBody.ok = false;
      baseBody.anthropicError = error && error.message ? error.message : String(error);
    } finally {
      t.clear();
    }
  } else {
    baseBody.checks.anthropic = "not_configured";
  }

  const status = baseBody.ok ? 200 : 503;
  if (baseBody.ok) {
    context.res = {
      status,
      headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: baseBody
    };
    observability.endRequest(context, obs, status, { health: "ok" });
  } else {
    observability.failRequest(context, obs, new Error("Health checks failing"), status);
    context.res = {
      status,
      headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: baseBody
    };
  }
};
