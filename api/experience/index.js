const { Client } = require("pg");

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

async function callAnthropicForContexts(profile, experiences, apiKey) {
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

  const systemPrompt = [
    `You generate concise role context for ${profile.name}.`,
    "Use first-person voice as the candidate.",
    "Ground everything in the provided data only.",
    "Return strict JSON only."
  ].join("\n");

  const userPrompt = [
    "Generate role context for each experience with fields:",
    "- id (number)",
    "- situation (1 sentence)",
    "- approach (1 sentence)",
    "- technicalWork (1 sentence)",
    "- lessonsLearned (1 sentence)",
    "Response format:",
    "{\"experiences\":[{...}]}",
    "Data:",
    JSON.stringify(compactExperiences)
  ].join("\n");

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
    `SELECT id, name, title
     FROM candidate_profile
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`
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
     WHERE candidate_id = $1
     ORDER BY display_order ASC, start_date DESC NULLS LAST`,
    [candidateId]
  );

  const skillsResult = await client.query(
    `SELECT skill_name, category
     FROM skills
     WHERE candidate_id = $1
     ORDER BY category ASC, self_rating DESC NULLS LAST, skill_name ASC`,
    [candidateId]
  );

  return {
    profile,
    experiences: experiencesResult.rows,
    skills: skillsResult.rows
  };
}

module.exports = async function(context) {
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!databaseUrl) {
    context.res = {
      status: 500,
      body: { error: "DATABASE_URL is not configured" }
    };
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
      aiContexts = await callAnthropicForContexts(payload.profile, payload.experiences, apiKey);
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
      gap: payload.skills.filter((s) => s.category === "gap").map((s) => s.skill_name)
    };

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        profile: {
          name: payload.profile.name,
          title: payload.profile.title
        },
        experiences,
        skills
      }
    };
  } catch (error) {
    context.log.error("experience endpoint failed", error);
    const message = error && error.message ? error.message : "Unable to load experience data";
    const isTimeout = /timeout/i.test(message);
    context.res = {
      status: isTimeout ? 504 : 500,
      body: { error: message }
    };
  } finally {
    await client.end().catch(() => {});
  }
};
