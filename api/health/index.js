const { Client } = require("../db");
const { beginRequest, endRequest, failRequest, withRequestId } = require("../_shared/observability");

const API_TIMEOUT_MS = 3000;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/models";
const ANTHROPIC_VERSION = "2023-06-01";

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timeout) };
}

module.exports = async function(context, req) {
  const obs = beginRequest(context, req, "health.get");
  function normalizeConn(raw) {
    if (raw === null || raw === undefined) return '';
    let s = String(raw).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }
    return s;
  }
  const databaseUrl = normalizeConn(process.env.DATABASE_URL);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const aiModel = process.env.AI_MODEL;
 

  const baseBody = {
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

  // DB check (DATABASE_URL)
  if (databaseUrl) {
    const client = new Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.query("SELECT 1");
      baseBody.checks.database = "ok";
    } catch (error) {
      baseBody.checks.database = "error";
      baseBody.ok = false;
      baseBody.dbError = error && error.message ? error.message : String(error);
      baseBody.dbStack = error && error.stack ? error.stack : null;
      try {
        const s = String(databaseUrl || '');
        let masked = s.replace(/\s+/g, '');
        masked = masked.replace(/(:|=)([^;@,]+)(@|;|,|$)/g, (m, p1, secret, p2) => `${p1}****${p2}`);
        masked = masked.split('?')[0];
        baseBody.dbConnection = masked;
      } catch (e) { 
        void 0; 
      }
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
          let data = null;
          try {
            data = await res.json();
          } catch (e) {
            void 0;
          }

          // If an AI model is specified, confirm it exists in the Anthropic models list
          if (aiModel && data) {
            let models = [];
            if (Array.isArray(data.models)) {
              models = data.models.map((m) => (m && m.id ? String(m.id) : (m && m.name ? String(m.name) : String(m))).trim());
            } else if (Array.isArray(data)) {
              models = data.map((m) => (m && m.id ? String(m.id) : (m && m.name ? String(m.name) : String(m))).trim());
            } else if (Array.isArray(data.data)) {
              models = data.data.map((m) => (m && m.id ? String(m.id) : (m && m.name ? String(m.name) : String(m))).trim());
            }
            const found = models.length > 0 && (models.includes(aiModel) || models.map((s) => s.toLowerCase()).includes(String(aiModel).toLowerCase()));
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
          } catch (_) { void 0; }
        }
    } catch (error) {
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
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: baseBody
    };
    endRequest(context, obs, status, { health: "ok" });
  } else {
    failRequest(context, obs, new Error("Health checks failing"), status);
    context.res = {
      status,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: baseBody
    };
  }
};
