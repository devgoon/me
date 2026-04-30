/**
 * @fileoverview Fit-related endpoints and helpers.
 * @module api/fit/index.js
 */

const { Client } = require('../db');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 10000;

// use shared server fetch helper for timeouts/retries
const { fetchWithTimeout } = require('../fetch');

/**
 * Create and return a configured DB client for use in this module. Throws
 * when `AZURE_DATABASE_URL` is not configured.
 *
 * @returns {Client}
 */
function getDbClient() {
  const databaseUrl = process.env.AZURE_DATABASE_URL;
  if (!databaseUrl) throw new Error('AZURE_DATABASE_URL is not configured');
  return new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function toCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    const camel = k.replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
    out[camel] = obj[k];
  }
  return out;
}

/**
 * Convert object keys from snake_case to camelCase shallowly.
 * @param {Object} obj
 * @returns {Object}
 */
// Note: duplicate declaration avoided by keeping original `toCamel` above.

/**
 * Public fit endpoint. GET returns public candidate summary; POST performs
 * a job-description fit analysis using the AI model configured via
 * `ANTHROPIC_API_KEY`.
 * @param {Object} context - Azure Functions context
 * @param {Object} req - Incoming request
 */
module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'fit.public');
  let client;
  try {
    // If POST => perform JD analysis (consolidated from fit-check)
    if (String(req.method || '').toUpperCase() === 'POST') {
      // inline minimal fit-check handler
      const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
      const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001';
      const MAX_TOKENS = 1024;
      const AI_TIMEOUT_MS = 20000;

      /**
       * Create an abort signal with a clear helper for AI calls.
       * @param {number} ms
       * @returns {{signal:AbortSignal, clear:Function}}
       */
      const timeoutSignal = (ms) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        return { signal: controller.signal, clear: () => clearTimeout(timeout) };
      };

      // prompt helpers moved to `api/prompts.js`; no local copies needed here

      const { buildFitPrompt } = require('../prompts');

      /**
       * Load candidate context (profile, experiences, skills, gaps, etc.)
       * for use in the fit prompt.
       * @param {import('../db').Client} client
       * @returns {Promise<Object>}
       */
      const loadCandidateContext = async (client) => {
        const profileResult = await client.queryWithRetry(
          `SELECT TOP 1 * FROM candidate_profile ORDER BY updated_at DESC, created_at DESC`
        );
        if (profileResult.rows.length === 0) throw new Error('No candidate profile found');
        const profile = profileResult.rows[0];
        const candidateId = profile.id;
        const experiencesResult = await client.queryWithRetry(
          `SELECT * FROM experiences WHERE candidate_id = @p1 ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
          [candidateId]
        );
        // Load skills and their equivalents (text-based)
        const skillsResult = await client.queryWithRetry(
          `
          SELECT s.id, s.candidate_id, s.skill_name, s.category, s.self_rating, s.evidence, s.honest_notes, s.years_experience, s.last_used,
                 STRING_AGG(eq.equivalent_name, ',') AS equivalents
          FROM skills s
          LEFT JOIN skill_equivalence eq ON s.skill_name = eq.skill_name
          WHERE s.candidate_id = @p1
          GROUP BY s.id, s.candidate_id, s.skill_name, s.category, s.self_rating, s.evidence, s.honest_notes, s.years_experience, s.last_used
          ORDER BY s.category ASC, CASE WHEN s.self_rating IS NULL THEN 1 ELSE 0 END ASC, s.self_rating DESC, s.skill_name ASC
        `,
          [candidateId]
        );
        const gapsResult = await client.queryWithRetry(
          `SELECT * FROM gaps_weaknesses WHERE candidate_id = @p1 ORDER BY id ASC`,
          [candidateId]
        );
        const valuesResult = await client.queryWithRetry(
          `SELECT TOP 1 * FROM values_culture WHERE candidate_id = @p1 ORDER BY created_at DESC`,
          [candidateId]
        );
        const faqResult = await client.queryWithRetry(
          `SELECT * FROM faq_responses WHERE candidate_id = @p1 ORDER BY is_common_question DESC, id ASC`,
          [candidateId]
        );
        const aiInstructionsResult = await client.queryWithRetry(
          `SELECT * FROM ai_instructions WHERE candidate_id = @p1 ORDER BY priority ASC, id ASC`,
          [candidateId]
        );
        const educationResult = await client.queryWithRetry(
          `SELECT * FROM education WHERE candidate_id = @p1 ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
          [candidateId]
        );

        // Attempt to load certifications if the table exists
        let certificationsResult = { rows: [] };
        try {
          certificationsResult = (await client.queryWithRetry(
            `SELECT id, name, issuer, issue_date, expiration_date, credential_id, verification_url, notes, display_order
             FROM certifications
            WHERE candidate_id = @p1
             ORDER BY display_order ASC, CASE WHEN issue_date IS NULL THEN 1 ELSE 0 END ASC, issue_date DESC`,
            [candidateId]
          )) || { rows: [] };
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
      };

      /**
       * Call Anthropic with retry/backoff and return assistant text.
       * @param {string} systemPrompt
       * @param {string} userMessage
       * @param {string} apiKey
       * @returns {Promise<string>}
       */
      const callAnthropic = async (systemPrompt, userMessage, apiKey) => {
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
                  messages: [{ role: 'user', content: userMessage }],
                }),
              },
              AI_TIMEOUT_MS
            );

            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              const status = response.status;
              lastErr = new Error(`Anthropic API error: ${status} ${errText}`);
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
            if (data && typeof data.text === 'string') return data.text;
            return '';
          } catch (error) {
            if (error && error.name === 'AbortError') lastErr = new Error('Anthropic API timeout');
            else lastErr = error;
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
      };

      // Validate inputs
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const databaseUrl = process.env.AZURE_DATABASE_URL;
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

      const jobDescription =
        req && req.body && typeof req.body.jobDescription === 'string'
          ? req.body.jobDescription.trim()
          : '';
      if (!jobDescription) {
        context.res = {
          status: 400,
          headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
          body: { error: "Request body must include a non-empty 'jobDescription' string" },
        };
        endRequest(context, obs, 400);
        return;
      }

      client = getDbClient();
      await client.connect();
      try {
        const ctx = await loadCandidateContext(client);
        const systemPrompt = buildFitPrompt(ctx) + `\n\nJOB DESCRIPTION:\n${jobDescription}`;

        const instruction = `You are an assistant that MUST return a JSON object ONLY. The JSON MUST have these keys: score (integer 0-100), verdict (one of "FIT", "MARGINAL", "NO FIT"), reasons (array of short strings), mismatches (array of short strings), suggestedMessage (a concise one-paragraph message the candidate could send to a recruiter). Analyze the candidate context and the job description above. Return only valid JSON with those keys.`;

        const aiResponse = await callAnthropic(systemPrompt, instruction, apiKey);

        let parsed = null;
        try {
          const firstJson = aiResponse && aiResponse.trim().match(/\{[\s\S]*\}/);
          if (firstJson) parsed = JSON.parse(firstJson[0]);
          else parsed = JSON.parse(aiResponse);
        } catch {
          parsed = {
            score: 50,
            verdict: 'MARGINAL',
            reasons: ['AI response could not be parsed; fallback used'],
            mismatches: [],
            suggestedMessage: "I'd like to learn more about this role to confirm fit.",
          };
        }

        context.res = {
          status: 200,
          headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
          body: parsed,
        };
        endRequest(context, obs, 200);
        return;
      } finally {
        if (client) await client.end().catch(() => {});
      }
    }

    // Default GET behavior: return public profile/skills/gaps/education
    client = getDbClient();
    await client.connect();

    // load latest candidate profile
    const profileRes = await client.queryWithRetry(
      `SELECT TOP 1 id, name, title, elevator_pitch FROM candidate_profile ORDER BY updated_at DESC, created_at DESC`
    );
    if (!profileRes.rows.length) {
      context.res = {
        status: 404,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { error: 'No profile available' },
      };
      endRequest(context, obs, 404);
      return;
    }
    const profile = toCamel(profileRes.rows[0]);

    const skillsRes = await client.queryWithRetry(
      `SELECT skill_name, category, honest_notes, evidence FROM skills WHERE candidate_id = @p1 ORDER BY category ASC, CASE WHEN self_rating IS NULL THEN 1 ELSE 0 END ASC, self_rating DESC, skill_name ASC`,
      [profileRes.rows[0].id]
    );
    const gapsRes = await client.queryWithRetry(
      `SELECT description, why_its_a_gap FROM gaps_weaknesses WHERE candidate_id = @p1 ORDER BY id ASC`,
      [profileRes.rows[0].id]
    );
    const educationRes = await client.queryWithRetry(
      `SELECT institution, degree, field_of_study, start_date, end_date, is_current, grade, notes FROM education WHERE candidate_id = @p1 ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
      [profileRes.rows[0].id]
    );

    const skills = skillsRes.rows.map((r) => ({
      skillName: r.skill_name || '',
      category: r.category || '',
      honestNotes: r.honest_notes || '',
      evidence: r.evidence || '',
    }));
    const gaps = gapsRes.rows.map((r) => ({
      description: r.description || '',
      whyItsAGap: r.why_its_a_gap || '',
    }));
    const education = educationRes.rows.map((r) => ({
      institution: r.institution || '',
      degree: r.degree || '',
      fieldOfStudy: r.field_of_study || '',
      startDate: r.start_date || null,
      endDate: r.end_date || null,
      current: Boolean(r.is_current),
      grade: r.grade || '',
      notes: r.notes || '',
    }));

    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { profile, skills, gaps, education },
    };
    endRequest(context, obs, 200);
  } catch (error) {
    failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: error.message || 'Failed to load fit data' },
    };
  } finally {
    if (client) await client.end().catch(() => {});
  }
};
