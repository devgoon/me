/**
 * @fileoverview Chat API integrating with Anthropic AI models.
 * @module api/chat/index.js
 */

const { Client } = require('../db');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');
const crypto = require('crypto');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const DB_CONNECT_TIMEOUT_MS = 30000;
const DB_QUERY_TIMEOUT_MS = 30000;
const AI_TIMEOUT_MS = 60000;

/**
 * Create an AbortController with a timeout and a clear function.
 *
 * @param {number} ms - Milliseconds until abort.
 * @returns {{signal:AbortSignal, clear:Function}}
 */
function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

// prefer server-side fetch helpers for consistent timeouts/retries
const { fetchWithTimeout } = require('../fetch');

// use centralized `q` from ../db for write retries
// helper moved to prompts module; keep no local definition

// helper functions moved to prompts module; keep only `textOrNA` here

const { buildChatPrompt } = require('../prompts');

/**
 * Load candidate profile, experiences, skills, gaps, values, FAQ and
 * related context from the database for use in chat prompts.
 *
 * @param {import('../db').Client} client
 * @returns {Promise<Object>} Candidate context object.
 */
async function loadCandidateContext(client) {
  const profileResult = await client.queryWithRetry(
    `SELECT TOP 1 *
     FROM candidate_profile
     ORDER BY updated_at DESC, created_at DESC`
  );

  if (profileResult.rows.length === 0) {
    throw new Error('No candidate profile found');
  }

  const profile = profileResult.rows[0];
  const candidateId = profile.id;

  const experiencesResult = await client.queryWithRetry(
    `SELECT *
     FROM experiences
     WHERE candidate_id = @p1
     ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
    [candidateId]
  );

  const skillsResult = await client.queryWithRetry(
    `SELECT s.id, s.candidate_id, s.skill_name, s.category, s.self_rating, s.evidence, s.honest_notes, s.years_experience, s.last_used,
            STRING_AGG(eq.equivalent_name, ',') AS equivalents
     FROM skills s
     LEFT JOIN skill_equivalence eq ON s.skill_name = eq.skill_name
    WHERE s.candidate_id = @p1
     GROUP BY s.id, s.candidate_id, s.skill_name, s.category, s.self_rating, s.evidence, s.honest_notes, s.years_experience, s.last_used
     ORDER BY s.category ASC, CASE WHEN s.self_rating IS NULL THEN 1 ELSE 0 END ASC, s.self_rating DESC, s.skill_name ASC`,
    [candidateId]
  );

  const gapsResult = await client.queryWithRetry(
    `SELECT *
     FROM gaps_weaknesses
    WHERE candidate_id = @p1
     ORDER BY id ASC`,
    [candidateId]
  );

  const valuesResult = await client.queryWithRetry(
    `SELECT TOP 1 *
     FROM values_culture
    WHERE candidate_id = @p1
     ORDER BY created_at DESC`,
    [candidateId]
  );

  const faqResult = await client.queryWithRetry(
    `SELECT *
     FROM faq_responses
      WHERE candidate_id = @p1
     ORDER BY is_common_question DESC, id ASC`,
    [candidateId]
  );

  const aiInstructionsResult = await client.queryWithRetry(
    `SELECT *
     FROM ai_instructions
      WHERE candidate_id = @p1
     ORDER BY priority ASC, id ASC`,
    [candidateId]
  );

  const educationResult = await client.queryWithRetry(
    `SELECT *
     FROM education
      WHERE candidate_id = @p1
      ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
    [candidateId]
  );

  // Attempt to load certifications if the table exists
  let certificationsResult = { rows: [] };
  try {
    certificationsResult = await client.queryWithRetry(
      `SELECT id, name, issuer, issue_date, expiration_date, credential_id, verification_url, notes, display_order
         FROM certifications
         WHERE candidate_id = @p1
           ORDER BY display_order ASC, CASE WHEN issue_date IS NULL THEN 1 ELSE 0 END ASC, issue_date DESC`,
      [candidateId]
    );
  } catch {
    certificationsResult = { rows: [] };
  }

  return {
    profile,
    experiences: experiencesResult.rows,
    skills: skillsResult.rows,
    gaps: gapsResult.rows,
    education: educationResult.rows,
    certifications: certificationsResult.rows,
    values: valuesResult.rows[0] || null,
    faq: faqResult.rows,
    aiInstructions: aiInstructionsResult.rows,
  };
}

/**
 * Call the Anthropic API with retry/backoff and return the assistant text.
 *
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {string} apiKey
 * @returns {Promise<string>} Assistant response text.
 */
async function callAnthropic(systemPrompt, userMessage, apiKey) {
  const maxAttempts = 3;
  let attempt = 0;
  let lastErr = null;

  while (attempt < maxAttempts) {
    attempt++;
    const timeout = timeoutSignal(AI_TIMEOUT_MS);
    try {
      const response = await fetchWithTimeout(
        ANTHROPIC_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: AI_MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: userMessage,
              },
            ],
          }),
        },
        AI_TIMEOUT_MS
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        const status = response.status;
        lastErr = new Error(`Anthropic API error: ${status} ${errText}`);
        // Retry on transient server-side errors
        if (status === 429 || status === 503 || status === 529) {
          const backoff = 200 * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }
        throw lastErr;
      }

      const data = await response.json().catch(() => null);
      const textBlock =
        data && (data.content || data.data || [])
          ? Array.isArray(data.content)
            ? data.content.find((item) => item.type === 'text')
            : null
          : null;
      if (textBlock && textBlock.text) return textBlock.text;

      // Some Anthropic responses may return a top-level text field
      if (data && typeof data.text === 'string') return data.text;

      return 'I do not have an answer for that yet.';
    } catch (error) {
      if (error && error.name === 'AbortError') {
        lastErr = new Error('Anthropic API timeout');
        try {
          console.warn(
            `chat.callAnthropic: Anthropic API timeout after ${AI_TIMEOUT_MS}ms on attempt ${attempt}`
          );
        } catch {
          /* noop */
        }
      } else {
        lastErr = error;
        try {
          console.warn(
            `chat.callAnthropic: Anthropic API error on attempt ${attempt}:`,
            error && error.message ? error.message : error
          );
        } catch {
          /* noop */
        }
      }
      // exponential backoff before retrying
      const backoff = 200 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    } finally {
      try {
        timeout.clear();
      } catch {
        void 0;
      }
    }
  }

  throw lastErr || new Error('Anthropic API failure');
}

/**
 * Lookup a cached AI response by model+question hash and return stored response.
 *
 * @param {import('../db').Client} client
 * @param {string} model
 * @param {string} question
 * @returns {Promise<string|null>} Cached response or null.
 */
async function getCache(client, model, question) {
  const hash = crypto
    .createHash('sha256')
    .update(model + '|' + question)
    .digest('hex');
  const start = Date.now();
  const result = await client.queryWithRetry(
    `SELECT TOP 1 response, cache_hit_count FROM ai_response_cache WHERE hash = @p1 AND is_cached = 1`,
    [hash]
  );
  const duration = Date.now() - start;
  try {
    console.info(
      `chat.getCache: lookup hash=${hash} duration=${duration}ms rows=${result.rows.length}`
    );
  } catch {
    /* ignore logging errors */
  }
  if (result.rows.length > 0) {
    await client.queryWithRetry(
      `UPDATE ai_response_cache SET cache_hit_count = cache_hit_count + 1, last_accessed = GETUTCDATE() WHERE hash = @p1`,
      [hash]
    );
    return result.rows[0].response;
  }
  return null;
}

/**
 * Store or merge a response into the AI response cache by hash key.
 *
 * @param {import('../db').Client} client
 * @param {string} model
 * @param {string} question
 * @param {string|Object|null} response
 * @returns {Promise<void>}
 */
async function setCache(client, model, question, response) {
  const hash = crypto
    .createHash('sha256')
    .update(model + '|' + question)
    .digest('hex');
  // Ensure stored response is minified: trim strings, stringify objects without spacing
  const responseToStore =
    response === null || response === undefined
      ? ''
      : typeof response === 'string'
      ? response.trim()
      : JSON.stringify(response);

  await client.queryWithRetry(
    `MERGE ai_response_cache AS target
       USING (SELECT @p1 AS hash, @p2 AS question, @p3 AS model, @p4 AS response, 1 AS cache_hit_count, GETUTCDATE() AS last_accessed, GETUTCDATE() AS updated_at, 1 AS is_cached) AS src
       ON target.hash = src.hash AND target.model = src.model
       WHEN MATCHED THEN
         UPDATE SET response = src.response, cache_hit_count = ISNULL(target.cache_hit_count, 0) + 1, last_accessed = src.last_accessed, updated_at = src.updated_at, is_cached = src.is_cached
       WHEN NOT MATCHED THEN
         INSERT (hash, question, model, response, cache_hit_count, last_accessed, updated_at, is_cached)
         VALUES (src.hash, src.question, src.model, src.response, src.cache_hit_count, src.last_accessed, src.updated_at, src.is_cached);`,
    [hash, question, model, responseToStore]
  );
}

/**
 * Chat API handler. Accepts a JSON body with `message` and returns an
 * assistant response. Integrates DB cache + Anthropic calls.
 *
 * @param {Object} context - Azure Functions context object.
 * @param {Object} req - Incoming request object.
 */
module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'chat.ask');
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const databaseUrl = process.env.AZURE_DATABASE_URL;

    // Log the AI model being used for this request
    try {
      const modelLog = { event: 'chat.model', requestId: obs.requestId, model: AI_MODEL };
      if (context && context.log) {
        if (typeof context.log.info === 'function') context.log.info(JSON.stringify(modelLog));
        else if (typeof context.log === 'function') context.log(JSON.stringify(modelLog));
      }
    } catch {
      void 0;
    }

    if (!apiKey) {
      context.res = {
        status: 500,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { error: 'ANTHROPIC_API_KEY is not configured' },
      };
      endRequest(context, obs, 500);
      return;
    }

    if (!databaseUrl) {
      context.res = {
        status: 500,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { error: 'AZURE_DATABASE_URL is not configured' },
      };
      endRequest(context, obs, 500);
      return;
    }

    const userMessage =
      req && req.body && typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!userMessage) {
      context.res = {
        status: 400,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { error: "Request body must include a non-empty 'message' string" },
      };
      endRequest(context, obs, 400);
      return;
    }

    const client = new Client({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
      query_timeout: DB_QUERY_TIMEOUT_MS,
      statement_timeout: DB_QUERY_TIMEOUT_MS,
    });

    // Connect with retries to survive cold-start / transient DB connection failures
    async function connectWithRetry(c, maxAttempts = 3, baseDelay = 200) {
      let attempt = 0;
      while (attempt < maxAttempts) {
        attempt++;
        const start = Date.now();
        try {
          await c.connect();
          const dur = Date.now() - start;
          try {
            console.info(
              `chat.connectWithRetry: connected on attempt=${attempt} duration=${dur}ms`
            );
          } catch {
            /* ignore logging errors */
          }
          return;
        } catch (err) {
          const dur = Date.now() - start;
          try {
            console.warn(
              `chat.connectWithRetry: connect attempt=${attempt} failed duration=${dur}ms error=${
                err && err.message ? err.message : err
              }`
            );
          } catch {
            /* ignore logging errors */
          }
          if (attempt >= maxAttempts) throw err;
          const backoff = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    await connectWithRetry(client);

    let assistantResponse;
    try {
      // Check cache first
      const cached = await getCache(client, AI_MODEL, userMessage);
      if (cached) {
        assistantResponse = cached;
      } else {
        const contextPayload = await loadCandidateContext(client);
        const systemPrompt = buildChatPrompt(contextPayload);
        assistantResponse = await callAnthropic(systemPrompt, userMessage, apiKey);
        await setCache(client, AI_MODEL, userMessage, assistantResponse);
      }
    } finally {
      await client.end();
    }

    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { response: assistantResponse },
    };
    endRequest(context, obs, 200);
  } catch (error) {
    const message = error && error.message ? error.message : 'Unexpected chat error';
    const isTimeout = /timeout/i.test(message);
    const status = isTimeout ? 504 : 500;
    failRequest(context, obs, error, status);
    context.res = {
      status,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: message },
    };
  }
};

// Export helpers for unit testing
module.exports._helpers = {
  timeoutSignal,
  callAnthropic,
  getCache,
  setCache,
  loadCandidateContext,
};
