const { Client } = require("../db");
const crypto = require("crypto");
const { beginRequest, endRequest, failRequest, withRequestId } = require("../_shared/observability");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-20250514";
const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 10000;
const AI_TIMEOUT_MS = 15000;
const AI_MAX_TOKENS = 1400;

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout)
  };
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function textOrFallback(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  return String(value);
}

function buildFallbackContext(exp) {
  return {
    situation: textOrFallback(exp.why_joined, "Joined to take on higher-impact technical ownership in a complex environment."),
    approach: textOrFallback(exp.actual_contributions, "Focused on clear architecture, reliable delivery, and practical collaboration across teams."),
    technicalWork: textOrFallback(exp.proudest_achievement, "Delivered production systems with strong emphasis on operability and measurable outcomes."),
    lessonsLearned: textOrFallback(exp.lessons_learned, "Strong contracts and observability improve long-term delivery speed and reliability.")
  };
}

function sanitizeAiContexts(raw, experiences) {
  const allowedIds = new Set(experiences.map((exp) => exp.id));
  const byId = {};

  if (!raw || !Array.isArray(raw.experiences)) {
    return byId;
  }

  for (const item of raw.experiences) {
    if (!item || !allowedIds.has(item.id)) {
      continue;
    }

    byId[item.id] = {
      situation: textOrFallback(item.situation, buildFallbackContext(experiences.find((e) => e.id === item.id)).situation),
      approach: textOrFallback(item.approach, buildFallbackContext(experiences.find((e) => e.id === item.id)).approach),
      technicalWork: textOrFallback(item.technicalWork, buildFallbackContext(experiences.find((e) => e.id === item.id)).technicalWork),
      lessonsLearned: textOrFallback(item.lessonsLearned, buildFallbackContext(experiences.find((e) => e.id === item.id)).lessonsLearned)
    };
  }

  return byId;
}

function extractJsonObject(text) {
  if (!text) {
    return null;
  }

  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : text;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  const jsonSlice = candidate.slice(start, end + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch (error) {
    return null;
  }
}

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
    } catch (e) {
      // fallthrough
    }
    // Comma separated or newline separated
    const byComma = s.split(/,\s*/).map(x => x.trim()).filter(Boolean);
    if (byComma.length > 1) return byComma;
    return s.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  }
  if (typeof val === 'object') {
    try { return Object.values(val).map(String); } catch (e) { return []; }
  }
  return [];
}

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
    challenges_faced: exp.challenges_faced
  }));

  const { buildExperienceSystemPrompt, buildExperienceUserPrompt } = require('../prompts');
  const systemPrompt = buildExperienceSystemPrompt(profile);
  // Pass certifications through to the experience user prompt if provided
  const userPrompt = buildExperienceUserPrompt({ experiences: compactExperiences, certifications: certifications || [] });

  const timeout = timeoutSignal(AI_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: AI_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      }),
      signal: timeout.signal
    });
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Anthropic API timeout");
    }
    throw error;
  } finally {
    timeout.clear();
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find((item) => item.type === "text");
  const parsed = extractJsonObject(textBlock ? textBlock.text : "");
  return sanitizeAiContexts(parsed, experiences);
}

async function loadCandidateData(client) {
  const profileResult = await client.query(
    `SELECT TOP 1 id, name, title
     FROM candidate_profile
     ORDER BY updated_at DESC, created_at DESC`
  );

  if (profileResult.rows.length === 0) {
    throw new Error("No candidate profile found");
  }

  const profile = profileResult.rows[0];
  const candidateId = profile.id;

  const experiencesResult = await client.query(
    `SELECT id, company_name, title, title_progression, start_date, end_date, is_current,
            bullet_points, why_joined, actual_contributions, proudest_achievement,
            lessons_learned, challenges_faced
     FROM experiences
    WHERE candidate_id = @p1
     ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
    [candidateId]
  );

  // Normalize bullet_points to arrays to handle JSON/text DB representations
  experiencesResult.rows = experiencesResult.rows.map((r) => ({
    ...r,
    bullet_points: coerceToArray(r.bullet_points)
  }));

  const skillsResult = await client.query(
    `SELECT s.id, s.candidate_id, s.skill_name, s.category, s.self_rating, s.evidence, s.honest_notes, s.years_experience, s.last_used,
            STRING_AGG(eq.equivalent_name, ',') AS equivalents
     FROM skills s
     LEFT JOIN skill_equivalence eq ON s.skill_name = eq.skill_name
    WHERE s.candidate_id = @p1
     GROUP BY s.id, s.candidate_id, s.skill_name, s.category, s.self_rating, s.evidence, s.honest_notes, s.years_experience, s.last_used
     ORDER BY s.category ASC, CASE WHEN s.self_rating IS NULL THEN 1 ELSE 0 END ASC, s.self_rating DESC, s.skill_name ASC`,
    [candidateId]
  );

  const gapsResult = await client.query(
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
    gaps: gapsResult.rows.map((row) => ({ description: row.description, interestedInLearning: Boolean(row.interest_in_learning) }))
  };
}

module.exports = async function(context) {
  const req = context.req || null;
  const obs = beginRequest(context, req, "experience.get");
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!databaseUrl) {
    context.res = {
      status: 500,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: { error: "DATABASE_URL is not configured" }
    };
    endRequest(context, obs, 500);
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
    const payload = await loadCandidateData(client);

    let aiContexts = {};
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
        challenges_faced: exp.challenges_faced
      }));

      // Optionally load certifications if the table exists and include them in prompts/cache
      let compactCertifications = [];
      try {
        const certRes = await client.query(
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
          notes: r.notes
        }));
      } catch (err) {
        compactCertifications = [];
      }

      const cacheKeyData = JSON.stringify({ model: AI_MODEL, profileId: payload.profile.id, experiences: compactExperiences, certifications: compactCertifications });
      const cacheHash = crypto.createHash("sha256").update(cacheKeyData).digest("hex");

      // Try to read from cache table if it exists. Failures here should not block the response.
      try {
        const cacheSel = await client.query(
          `SELECT TOP 1 hash, response
           FROM ai_response_cache
           WHERE model = @p1 AND hash = @p2`,
          [AI_MODEL, cacheHash]
        );

        if (cacheSel.rows && cacheSel.rows.length > 0) {
          const row = cacheSel.rows[0];
          try {
            aiContexts = JSON.parse(row.response || "{}");
          } catch (err) {
            aiContexts = {};
          }

          // update hit count and last_accessed (use hash as primary key)
          await client.query(
            `UPDATE ai_response_cache SET cache_hit_count = COALESCE(cache_hit_count,0) + 1, last_accessed = GETUTCDATE() WHERE hash = @p1`,
            [row.hash]
          );
        } else {
          // cache miss: call Anthropic and insert result (include certifications if available)
          aiContexts = await callAnthropicForContexts(payload.profile, payload.experiences, apiKey, compactCertifications);
          try {
            // Use the cache key data as the stored "question" so the cache rows
            // have meaningful identifying text instead of an empty string.
            await client.query(
              `MERGE ai_response_cache AS target
               USING (SELECT @p1 AS question, @p2 AS model, @p3 AS hash, @p4 AS response, 1 AS cache_hit_count, GETUTCDATE() AS last_accessed, GETUTCDATE() AS updated_at, 1 AS is_cached) AS src
               ON target.hash = src.hash AND target.model = src.model
               WHEN MATCHED THEN
                 UPDATE SET response = src.response, updated_at = src.updated_at, is_cached = src.is_cached
               WHEN NOT MATCHED THEN
                 INSERT (question, model, hash, response, cache_hit_count, last_accessed, updated_at, is_cached)
                 VALUES (src.question, src.model, src.hash, src.response, src.cache_hit_count, src.last_accessed, src.updated_at, src.is_cached);`,
              [cacheKeyData, AI_MODEL, cacheHash, JSON.stringify(aiContexts || {})]
            );
          } catch (err) {
            // ignore cache write errors
            context.log && context.log.warn && context.log.warn("Failed to write AI cache", err.message || err);
          }
        }
        } catch (err) {
        // If cache table doesn't exist or query fails, fall back to calling Anthropic
        context.log && context.log.debug && context.log.debug("AI cache lookup failed, calling Anthropic", err.message || err);
        aiContexts = await callAnthropicForContexts(payload.profile, payload.experiences, apiKey, compactCertifications);
      }
    } catch (error) {
      context.log.warn("experience AI context generation failed, using fallback", error.message || error);
    }

    const experiences = payload.experiences.map((exp) => ({
      id: exp.id,
      companyName: exp.company_name,
      title: exp.title || exp.title_progression || "",
      startDate: toIsoDate(exp.start_date),
      endDate: exp.is_current ? null : toIsoDate(exp.end_date),
      isCurrent: Boolean(exp.is_current),
      bulletPoints: Array.isArray(exp.bullet_points) ? exp.bullet_points : [],
      aiContext: aiContexts[exp.id] || buildFallbackContext(exp)
    }));

    const skills = {
      strong: payload.skills.filter((s) => s.category === "strong").map((s) => s.skill_name),
      moderate: payload.skills.filter((s) => s.category === "moderate").map((s) => s.skill_name),
      gap: (payload.skills.filter((s) => s.category === "gap").map((s) => s.skill_name))
        .concat((payload.gaps || []).map((g) => ({ description: g.description, interestedInLearning: Boolean(g.interestedInLearning) })).filter(Boolean))
    };

    context.res = {
      status: 200,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: {
        profile: {
          name: payload.profile.name,
          title: payload.profile.title
        },
        experiences,
        skills
      }
    };
    endRequest(context, obs, 200);
  } catch (error) {
    const message = error && error.message ? error.message : "Unable to load experience data";
    const isTimeout = /timeout/i.test(message);
    const status = isTimeout ? 504 : 500;
    failRequest(context, obs, error, status);
    context.res = {
      status,
      headers: withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: { error: message }
    };
  } finally {
    await client.end().catch(() => {});
  }
};
