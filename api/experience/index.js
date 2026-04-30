/**
 * @fileoverview Experience-related AI endpoints and helpers.
 * @module api/experience/index.js
 */

const { Client } = require('../db');
const crypto = require('crypto');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const AI_MODEL = process.env.AI_MODEL || 'claude-haiku-4-5-20251001-blah';
const DB_CONNECT_TIMEOUT_MS = 10000;
const DB_QUERY_TIMEOUT_MS = 15000;
const AI_TIMEOUT_MS = 30000;
const AI_MAX_TOKENS = 1400;
const EXPERIENCE_QUESTION_KEY = 'experience_ai_contexts_v1';

/**
 * Create an AbortController that aborts after `ms` milliseconds.
 *
 * @param {number} ms - Timeout in milliseconds.
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

/**
 * Convert a value to an ISO YYYY-MM-DD date string or null.
 *
 * @param {*} value
 * @returns {string|null}
 */
function toIsoDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

/**
 * Return string value or a provided fallback when value is empty.
 *
 * @param {*} value
 * @param {string} fallback
 * @returns {string}
 */
function textOrFallback(value, fallback) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}

/**
 * Build a minimal AI context object from an experience row when no explicit
 * AI context is available.
 *
 * @param {Object} exp
 * @returns {Object}
 */
function buildFallbackContext(exp) {
  return {
    situation: textOrFallback(
      exp.why_joined,
      'Joined to take on higher-impact technical ownership in a complex environment.'
    ),
    approach: textOrFallback(
      exp.actual_contributions,
      'Focused on clear architecture, reliable delivery, and practical collaboration across teams.'
    ),
    technicalWork: textOrFallback(
      exp.proudest_achievement,
      'Delivered production systems with strong emphasis on operability and measurable outcomes.'
    ),
    lessonsLearned: textOrFallback(
      exp.lessons_learned,
      'Strong contracts and observability improve long-term delivery speed and reliability.'
    ),
  };
}

/**
 * Sanitize and map AI-generated context entries by experience id.
 *
 * @param {*} raw - Parsed AI response object.
 * @param {Array<Object>} experiences
 * @returns {Object} Map of experienceId -> context
 */
function sanitizeAiContexts(raw, experiences) {
  const byId = {};

  if (!raw || !Array.isArray(raw.experiences)) {
    return byId;
  }

  // Map stringified id -> original id and experience for stable lookup
  const idMap = new Map(experiences.map((e) => [String(e.id), { originalId: e.id, exp: e }]));

  for (const item of raw.experiences) {
    if (!item || typeof item.id === 'undefined' || item.id === null) continue;
    const idStr = String(item.id);
    if (!idMap.has(idStr)) continue;

    const { originalId, exp } = idMap.get(idStr);

    byId[originalId] = {
      situation: textOrFallback(item.situation, buildFallbackContext(exp).situation),
      approach: textOrFallback(item.approach, buildFallbackContext(exp).approach),
      technicalWork: textOrFallback(item.technicalWork, buildFallbackContext(exp).technicalWork),
      lessonsLearned: textOrFallback(item.lessonsLearned, buildFallbackContext(exp).lessonsLearned),
    };
  }

  return byId;
}

/**
 * Extract the first JSON object found in text (supports fenced JSON blocks).
 * Returns parsed object or null on failure.
 *
 * @param {string} text - Input string potentially containing JSON.
 * @returns {Object|null} Parsed object or null on failure.
 */
function extractJsonObject(text) {
  if (!text) {
    return null;
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  const jsonSlice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch {
    return null;
  }
}

/**
 * Coerce various input shapes into an array of strings.
 *
 * @param {*} val
 * @returns {Array<string>}
 */
function coerceToArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return [];
    // Try JSON array/object
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed).map(String);
    } catch {
      // fallthrough
    }
    // Comma separated or newline separated
    const byComma = s
      .split(/,\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (byComma.length > 1) return byComma;
    return s
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof val === 'object') {
    try {
      return Object.values(val).map(String);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Call Anthropic API to generate compact AI contexts for experiences.
 * Returns a mapping of experienceId -> context object.
 *
 * @param {Object} profile
 * @param {Array<Object>} experiences
 * @param {string} apiKey
 * @param {Array<Object>} certifications
 * @returns {Promise<Object>}
 */
async function callAnthropicForContexts(profile, experiences, apiKey, certifications) {
  if (!apiKey || experiences.length === 0) {
    return {};
  }

  const compactExperiences = experiences.map((exp) => ({
    id: exp.id,
    company_name: exp.company_name,
    title: exp.title,
    start_date: exp.start_date,
    end_date: exp.end_date,
    bullet_points: exp.bullet_points || [],
    why_joined: exp.why_joined,
    actual_contributions: exp.actual_contributions,
    proudest_achievement: exp.proudest_achievement,
    lessons_learned: exp.lessons_learned,
    challenges_faced: exp.challenges_faced,
  }));

  const { buildExperienceSystemPrompt, buildExperienceUserPrompt } = require('../prompts');
  const systemPrompt = buildExperienceSystemPrompt(profile);
  // Pass certifications through to the experience user prompt if provided
  const userPrompt = buildExperienceUserPrompt({
    experiences: compactExperiences,
    certifications: certifications || [],
  });
  // Use centralized fetch with a timeout for Anthropic calls
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
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    },
    AI_TIMEOUT_MS
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  let text = null;
  // common Anthropic response shapes: data.content (array of {type,text}), top-level text, data.output
  if (Array.isArray(data.content)) {
    const tb = data.content.find(
      (item) => item && item.type === 'text' && typeof item.text === 'string'
    );
    if (tb) text = tb.text;
  }
  if (!text && typeof data.text === 'string') text = data.text;
  if (!text && typeof data.content === 'string') text = data.content;
  if (!text && Array.isArray(data.data)) {
    const tb = data.data.find(
      (item) => item && item.type === 'text' && typeof item.text === 'string'
    );
    if (tb) text = tb.text;
  }
  if (!text && data && typeof data.output === 'string') text = data.output;

  // Optional debug: dump a truncated raw response when enabled to help diagnose empty responses
  if (!text && process.env.DEBUG_ANTHROPIC) {
    try {
      console.warn('Anthropic raw response:', JSON.stringify(data).slice(0, 2000));
    } catch {
      void 0;
    }
  }

  const parsed = extractJsonObject(text || '');
  return sanitizeAiContexts(parsed, experiences);
}

/**
 * Load candidate profile, experiences, skills and gaps from the database.
 *
 * @param {import('../db').Client} client
 * @returns {Promise<Object>} Normalized payload used by experience handlers.
 */
async function loadCandidateData(client) {
  const profileResult = await client.queryWithRetry(
    `SELECT TOP 1 id, name, title
     FROM candidate_profile
     ORDER BY updated_at DESC, created_at DESC`
  );

  if (profileResult.rows.length === 0) {
    throw new Error('No candidate profile found');
  }

  const profile = profileResult.rows[0];
  const candidateId = profile.id;

  const experiencesResult = await client.queryWithRetry(
    `SELECT id, company_name, title, title_progression, start_date, end_date, is_current,
          bullet_points, why_joined, actual_contributions, proudest_achievement,
          lessons_learned, challenges_faced
         FROM experiences
        WHERE candidate_id = @p1
         ORDER BY CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
    [candidateId]
  );

  // Normalize bullet_points to arrays to handle JSON/text DB representations
  experiencesResult.rows = experiencesResult.rows.map((r) => ({
    ...r,
    bullet_points: coerceToArray(r.bullet_points),
  }));

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
    `SELECT description, interest_in_learning
     FROM gaps_weaknesses
    WHERE candidate_id = @p1
     ORDER BY id ASC`,
    [candidateId]
  );

  return {
    profile,
    experiences: experiencesResult.rows,
    skills: skillsResult.rows,
    gaps: gapsResult.rows.map((row) => ({
      description: row.description,
      interestedInLearning: Boolean(row.interest_in_learning),
    })),
  };
}

/**
 * Experience API handler. Optionally enriches experiences with AI contexts
 * when an Anthropic API key is configured and the caller has not opted out.
 *
 * @param {Object} context - Azure Functions context
 */
module.exports = async function (context) {
  const req = context.req || null;
  const obs = beginRequest(context, req, 'experience.get');
  const databaseUrl = process.env.AZURE_DATABASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!databaseUrl) {
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'AZURE_DATABASE_URL is not configured' },
    };
    endRequest(context, obs, 500);
    return;
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS,
  });

  try {
    await client.connect();
    const payload = await loadCandidateData(client);

    let aiContexts = {};
    // Allow callers to skip AI enrichment (faster for classic lists)
    // Also skip AI enrichment entirely when no Anthropic API key is configured
    const skipAi = Boolean(
      req &&
        ((req.query && (req.query.skipAI === '1' || req.query.skipAI === 'true')) ||
          (req.headers &&
            (req.headers['x-skip-ai'] === '1' || req.headers['x-skip-ai'] === 'true')))
    );

    // If caller hasn't explicitly opted out, attempt cache lookup first.
    if (!skipAi) {
      try {
        // Build a compact representation of experiences to form a stable cache key
        const compactExperiences = payload.experiences.map((exp) => ({
          id: exp.id,
          company_name: exp.company_name,
          title: exp.title,
          start_date: exp.start_date,
          end_date: exp.end_date,
          bullet_points: exp.bullet_points || [],
          why_joined: exp.why_joined,
          actual_contributions: exp.actual_contributions,
          proudest_achievement: exp.proudest_achievement,
          lessons_learned: exp.lessons_learned,
          challenges_faced: exp.challenges_faced,
        }));

        // Optionally load certifications if the table exists and include them in prompts/cache
        let compactCertifications = [];
        try {
          const certRes = await client.queryWithRetry(
            `SELECT id, name, issuer, issue_date, expiration_date, credential_id, verification_url, notes, display_order
           FROM certifications
          WHERE candidate_id = @p1
           ORDER BY display_order ASC, CASE WHEN issue_date IS NULL THEN 1 ELSE 0 END ASC, issue_date DESC`,
            [payload.profile.id]
          );
          compactCertifications = certRes.rows.map((r) => ({
            id: r.id,
            name: r.name,
            issuer: r.issuer,
            issue_date: r.issue_date,
            expiration_date: r.expiration_date,
            credential_id: r.credential_id,
            verification_url: r.verification_url,
            notes: r.notes,
          }));
        } catch {
          compactCertifications = [];
        }

        const cacheKeyData = JSON.stringify({
          profile: payload.profile || {},
          experiences: compactExperiences,
          certifications: compactCertifications || [],
          model: AI_MODEL,
        });
        const cacheHash = crypto.createHash('sha256').update(cacheKeyData).digest('hex');

        // Try to read from cache table if it exists. Failures here should not block the response.
        try {
          const cacheSel = await client.queryWithRetry(
            `SELECT TOP 1 hash, response
           FROM ai_response_cache
           WHERE model = @p1 AND hash = @p2 AND is_cached = 1`,
            [AI_MODEL, cacheHash]
          );

          if (cacheSel.rows && cacheSel.rows.length > 0) {
            const row = cacheSel.rows[0];
            try {
              aiContexts = JSON.parse(row.response || '{"empty":true}');
            } catch {
              aiContexts = {};
            }

            // update hit count and last_accessed (use hash as primary key)
            await client.queryWithRetry(
              `UPDATE ai_response_cache SET cache_hit_count = COALESCE(cache_hit_count,0) + 1, last_accessed = GETUTCDATE() WHERE hash = @p1`,
              [row.hash]
            );
            console.log(`AI cache hit for hash ${row.hash}`);
          } else {
            // cache miss: only call Anthropic when an API key is configured
            if (apiKey) {
              aiContexts = await callAnthropicForContexts(
                payload.profile,
                payload.experiences,
                apiKey,
                compactCertifications
              );
              try {
                const responseStr = JSON.stringify(aiContexts || {});
                // Don't store empty objects or trivially small responses
                if (!responseStr || responseStr === '{}' || responseStr.length < 10) {
                  console.log(
                    `AI cache miss: empty or small response, not storing for question ${EXPERIENCE_QUESTION_KEY}`
                  );
                } else {
                  console.log(
                    `AI cache miss for question ${EXPERIENCE_QUESTION_KEY}, storing response (len=${responseStr.length})`
                  );
                  // insert cache record with hash as primary key, so duplicates will be ignored if another request has already cached the same response
                  try {
                    await client.queryWithRetry(
                      `INSERT INTO ai_response_cache (question, model, hash, response, cache_hit_count, last_accessed, updated_at, is_cached)
                       VALUES (@p1, @p2, @p3, @p4, 1, GETUTCDATE(), GETUTCDATE(), 1);`,
                      [EXPERIENCE_QUESTION_KEY, AI_MODEL, cacheHash, responseStr]
                    );
                    console.log(`AI cache miss - stored response with hash ${cacheHash}`);
                  } catch (err) {
                    // Ignore duplicate key race errors (another process inserted same hash concurrently)
                    try {
                      if (
                        err &&
                        (err.number === 2627 ||
                          (err.originalError &&
                            err.originalError.info &&
                            err.originalError.info.number === 2627))
                      ) {
                        console.warn('AI cache insert race: duplicate key, ignoring');
                      } else {
                        throw err;
                      }
                    } catch (inner) {
                      console.error('Failed to write AI cache', inner);
                      context.log &&
                        context.log.warn &&
                        context.log.warn('Failed to write AI cache', inner.message || inner);
                    }
                  }
                }
              } catch (err) {
                console.error('Failed to write AI cache', err);
                context.log &&
                  context.log.warn &&
                  context.log.warn('Failed to write AI cache', err.message || err);
              }
            } else {
              aiContexts = {};
            }
          }
        } catch (err) {
          console.error('AI cache lookup failed', err);
          // If cache table doesn't exist or query fails, fall back to calling Anthropic when available
          context.log &&
            context.log.debug &&
            context.log.debug('AI cache lookup failed', err.message || err);
          if (apiKey) {
            aiContexts = await callAnthropicForContexts(
              payload.profile,
              payload.experiences,
              apiKey,
              compactCertifications
            );
          } else {
            aiContexts = {};
          }
        }
      } catch (error) {
        console.error('Experience AI context generation failed, using fallback', error);
        context.log &&
          context.log.warn &&
          context.log.warn(
            'Experience AI context generation failed, using fallback',
            error.message || error
          );
      }
    } else {
      // Skip AI enrichment entirely
      aiContexts = {};
      console.log('Skipping AI enrichment for experience.get (skipAI=true)');
    }

    const experiences = payload.experiences.map((exp) => ({
      id: exp.id,
      companyName: exp.company_name,
      title: exp.title || exp.title_progression || '',
      startDate: toIsoDate(exp.start_date),
      endDate: exp.is_current ? null : toIsoDate(exp.end_date),
      isCurrent: Boolean(exp.is_current),
      bulletPoints: Array.isArray(exp.bullet_points) ? exp.bullet_points : [],
      aiContext: aiContexts[exp.id] || buildFallbackContext(exp),
    }));

    const skills = {
      strong: payload.skills.filter((s) => s.category === 'strong').map((s) => s.skill_name),
      moderate: payload.skills.filter((s) => s.category === 'moderate').map((s) => s.skill_name),
      gap: payload.skills
        .filter((s) => s.category === 'gap')
        .map((s) => s.skill_name)
        .concat(
          (payload.gaps || [])
            .map((g) => ({
              description: g.description,
              interestedInLearning: Boolean(g.interestedInLearning),
            }))
            .filter(Boolean)
        ),
    };

    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: {
        profile: {
          name: payload.profile.name,
          title: payload.profile.title,
        },
        experiences,
        skills,
      },
    };
    endRequest(context, obs, 200);
  } catch (error) {
    const message = error && error.message ? error.message : 'Unable to load experience data';
    const isTimeout = /timeout/i.test(message);
    const status = isTimeout ? 504 : 500;
    failRequest(context, obs, error, status);
    context.res = {
      status,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: message },
    };
  } finally {
    await client.end().catch(() => {});
  }
};

// Export helpers for unit testing
module.exports._helpers = {
  timeoutSignal,
  toIsoDate,
  textOrFallback,
  buildFallbackContext,
  sanitizeAiContexts,
  extractJsonObject,
  coerceToArray,
  callAnthropicForContexts,
  loadCandidateData,
};
