/**
 * @fileoverview Health check endpoint for the service.
 * @module api/health/index.js
 */

const { Client } = require('../db');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

const API_TIMEOUT_MS = 15000;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';
const ANTHROPIC_CHAT_URL = 'https://api.anthropic.com/v1/messages';
const { apiFetch } = require('../fetch');

module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'health.get');
  function normalizeConn(raw) {
    if (raw === null || raw === undefined) return '';
    let s = String(raw).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1);
    }
    return s;
  }
  const databaseUrl = normalizeConn(process.env.AZURE_DATABASE_URL);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const aiModel = process.env.AI_MODEL;

  const baseBody = {
    ok: true,
    service: 'me-api',
    timestamp: new Date().toISOString(),
    checks: {
      env: {
        databaseUrl: databaseUrl ? 'ok' : 'not_configured',
        anthropicKey: anthropicKey ? 'ok' : 'not_configured',
        aiModel: aiModel ? 'ok' : 'not_configured',
      },
      database: 'unknown',
      anthropic: 'unknown',
    },
  };

  // DB check (AZURE_DATABASE_URL)
  if (databaseUrl) {
    const client = new Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.queryWithRetry('SELECT 1');
      baseBody.checks.database = 'ok';
    } catch (error) {
      baseBody.checks.database = 'error';
      baseBody.ok = false;
      baseBody.dbError = error && error.message ? error.message : String(error);
      baseBody.dbStack = error && error.stack ? error.stack : null;
      try {
        const s = String(databaseUrl || '');
        let masked = s.replace(/\s+/g, '');
        masked = masked.replace(
          /(:|=)([^;@,]+)(@|;|,|$)/g,
          (m, p1, secret, p2) => `${p1}****${p2}`
        );
        masked = masked.split('?')[0];
        baseBody.dbConnection = masked;
      } catch {
        void 0;
      }
    } finally {
      await client.end().catch(() => {});
    }
  } else {
    baseBody.checks.database = 'not_configured';
  }

  // Query skills and ask Anthropic to summarize strongest skills
  if (baseBody.checks.database === 'ok' && anthropicKey) {
    const client2 = new Client({ connectionString: databaseUrl });
    try {
      await client2.connect();
      const skillsRes = await client2.queryWithRetry(
        `SELECT TOP 10 skill_name, self_rating FROM skills ORDER BY self_rating DESC, last_used DESC`
      );
      const skills = Array.isArray(skillsRes.rows)
        ? skillsRes.rows.map((r) => (r && r.skill_name ? String(r.skill_name) : '')).filter(Boolean)
        : [];
      const skillsText = skills.length > 0 ? skills.join(', ') : 'no skills found';

      const question = `What are your strongest skills? Candidate skills: ${skillsText}`;

      const aiResp = await apiFetch(
        ANTHROPIC_CHAT_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': ANTHROPIC_VERSION,
          },
          body: JSON.stringify({
            model: aiModel || 'claude-instant-1',
            max_tokens: 200,
            system: "You are a concise assistant that summarizes a candidate's strongest skills.",
            messages: [
              {
                role: 'user',
                content: question,
              },
            ],
          }),
        },
        { timeoutMs: API_TIMEOUT_MS * 2 }
      );

      if (aiResp && aiResp.ok) {
        let data = null;
        try {
          data = await aiResp.json();
        } catch {
          data = null;
        }
        // Extract text from common Anthropic response shapes
        let summary = null;
        if (data) {
          if (typeof data.text === 'string') summary = data.text;
          else if (Array.isArray(data.content)) {
            const tb = data.content.find((c) => c && c.type === 'text');
            if (tb && typeof tb.text === 'string') summary = tb.text;
          } else if (data.data && Array.isArray(data.data)) {
            const tb = data.data.find((c) => c && c.type === 'text');
            if (tb && typeof tb.text === 'string') summary = tb.text;
          }
        }
        baseBody.aiSummary = summary || 'no summary returned';
      } else {
        baseBody.aiSummaryError = aiResp ? `status:${aiResp.status}` : 'no response';
      }
    } catch (err) {
      baseBody.aiSummaryError = err && err.message ? err.message : String(err);
      baseBody.ok = false;
    } finally {
      await client2.end().catch(() => {});
    }
  }

  // Anthropic check
  if (anthropicKey) {
    try {
      // use local fetchWithTimeout helper to support environments without AbortController
      const res = await apiFetch(
        ANTHROPIC_API_URL,
        {
          method: 'GET',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': ANTHROPIC_VERSION,
            'Content-Type': 'application/json',
          },
        },
        { timeoutMs: API_TIMEOUT_MS }
      );
      if (res.ok) {
        let data = null;
        try {
          data = await res.json();
        } catch {
          void 0;
        }

        // If an AI model is specified, confirm it exists in the Anthropic models list
        if (aiModel && data) {
          let models = [];
          if (Array.isArray(data.models)) {
            models = data.models.map((m) =>
              (m && m.id ? String(m.id) : m && m.name ? String(m.name) : String(m)).trim()
            );
          } else if (Array.isArray(data)) {
            models = data.map((m) =>
              (m && m.id ? String(m.id) : m && m.name ? String(m.name) : String(m)).trim()
            );
          } else if (Array.isArray(data.data)) {
            models = data.data.map((m) =>
              (m && m.id ? String(m.id) : m && m.name ? String(m.name) : String(m)).trim()
            );
          }
          const found =
            models.length > 0 &&
            (models.includes(aiModel) ||
              models.map((s) => s.toLowerCase()).includes(String(aiModel).toLowerCase()));
          if (!found) {
            baseBody.checks.anthropic = `model_not_found:${aiModel}`;
            baseBody.ok = false;
            baseBody.anthropicBody = data;
          } else {
            baseBody.checks.anthropic = 'ok';
          }
        } else {
          baseBody.checks.anthropic = 'ok';
        }
      } else {
        baseBody.checks.anthropic = `error:${res.status}`;
        baseBody.ok = false;
        try {
          baseBody.anthropicBody = await res.text();
        } catch {
          void 0;
        }
      }
    } catch (error) {
      baseBody.checks.anthropic = 'error';
      baseBody.ok = false;
      baseBody.anthropicError = error && error.message ? error.message : String(error);
    }
  } else {
    baseBody.checks.anthropic = 'not_configured';
  }

  const status = baseBody.ok ? 200 : 503;
  if (baseBody.ok) {
    context.res = {
      status,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: baseBody,
    };
    endRequest(context, obs, status, { health: 'ok' });
  } else {
    failRequest(context, obs, new Error('Health checks failing'), status);
    context.res = {
      status,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: baseBody,
    };
  }
};
