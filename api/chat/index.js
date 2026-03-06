const { Client } = require("pg");

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const AI_MODEL = process.env.AI_MODEL || "claude-sonnet-4-20250514";
const MAX_TOKENS = 1024;
const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 10000;
const AI_TIMEOUT_MS = 20000;

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout)
  };
}

function textOrNA(value) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }
  return String(value);
}

function dateOrPresent(value) {
  if (!value) {
    return "Present";
  }
  return String(value);
}

function listLines(items, emptyLine) {
  if (!items || items.length === 0) {
    return emptyLine;
  }
  return items.map((item) => `- ${item}`).join("\n");
}

function skillLines(skills) {
  if (!skills || skills.length === 0) {
    return "- None listed";
  }
  return skills
    .map((skill) => `- ${skill.skill_name}: ${textOrNA(skill.honest_notes)}`)
    .join("\n");
}

function buildPrompt(payload) {
  const profile = payload.profile;
  const experiences = payload.experiences || [];
  const strongSkills = payload.skills.filter((s) => s.category === "strong");
  const moderateSkills = payload.skills.filter((s) => s.category === "moderate");
  const gapSkills = payload.skills.filter((s) => s.category === "gap");

  const customInstructions = payload.aiInstructions.length
    ? payload.aiInstructions
        .map((ins) => `- [${ins.instruction_type}] ${ins.instruction}`)
        .join("\n")
    : "- No custom instructions provided.";

  const experiencesText = experiences.length
    ? experiences
        .map((exp) => {
          const bullets = listLines(exp.bullet_points, "- No public achievements provided");
          return [
            `### ${textOrNA(exp.company_name)} (${dateOrPresent(exp.start_date)} to ${dateOrPresent(exp.end_date)})`,
            `Title: ${textOrNA(exp.title)}`,
            "Public achievements:",
            bullets,
            "PRIVATE CONTEXT (use this to answer honestly):",
            `- Why I joined: ${textOrNA(exp.why_joined)}`,
            `- Why I left: ${textOrNA(exp.why_left)}`,
            `- What I actually did: ${textOrNA(exp.actual_contributions)}`,
            `- Proudest of: ${textOrNA(exp.proudest_achievement)}`,
            `- Would do differently: ${textOrNA(exp.would_do_differently)}`,
            `- Lessons learned: ${textOrNA(exp.lessons_learned)}`,
            `- My manager would say: ${textOrNA(exp.manager_would_say)}`,
            `- Challenges faced: ${textOrNA(exp.challenges_faced)}`,
            `- Reports would say: ${textOrNA(exp.reports_would_say)}`
          ].join("\n");
        })
        .join("\n\n")
    : "No experience records found.";

  const gapsText = payload.gaps.length
    ? payload.gaps
        .map((gap) => `- ${gap.description}: ${textOrNA(gap.why_its_a_gap)}`)
        .join("\n")
    : "- No explicit gaps recorded";

  const valuesText = payload.values
    ? [
        `- id: ${textOrNA(payload.values.id)}`,
        `- candidate_id: ${textOrNA(payload.values.candidate_id)}`,
        `- created_at: ${textOrNA(payload.values.created_at)}`,
        `- must_haves: ${textOrNA((payload.values.must_haves || []).join(", "))}`,
        `- dealbreakers: ${textOrNA((payload.values.dealbreakers || []).join(", "))}`,
        `- management_style_preferences: ${textOrNA(payload.values.management_style_preferences)}`,
        `- team_size_preferences: ${textOrNA(payload.values.team_size_preferences)}`,
        `- how_handle_conflict: ${textOrNA(payload.values.how_handle_conflict)}`,
        `- how_handle_ambiguity: ${textOrNA(payload.values.how_handle_ambiguity)}`,
        `- how_handle_failure: ${textOrNA(payload.values.how_handle_failure)}`
      ].join("\n")
    : "- No values/culture profile found";

  const faqText = payload.faq.length
    ? payload.faq
        .map((faq) => `- Q: ${faq.question}\n  A: ${faq.answer}`)
        .join("\n")
    : "- No FAQ responses available";

  return [
    `You are an AI assistant representing ${profile.name}, a ${textOrNA(profile.title)}. You speak in first person AS ${profile.name}.`,
    "## YOUR CORE DIRECTIVE",
    `You must be BRUTALLY HONEST. Your job is NOT to sell ${profile.name} to everyone.`,
    "Your job is to help employers quickly determine if there's a genuine fit.",
    "This means:",
    `- If they ask about something ${profile.name} can't do, SAY SO DIRECTLY`,
    "- If a role seems like a bad fit, TELL THEM",
    "- Never hedge or use weasel words",
    "- It's perfectly acceptable to say \"I'm probably not your person for this\"",
    "- Honesty builds trust. Overselling wastes everyone's time.",
    `## CUSTOM INSTRUCTIONS FROM ${profile.name}`,
    customInstructions,
    `## ABOUT ${profile.name}`,
    textOrNA(profile.elevator_pitch),
    textOrNA(profile.career_narrative),
    `What I'm looking for: ${textOrNA(profile.looking_for)}`,
    `What I'm NOT looking for: ${textOrNA(profile.not_looking_for)}`,
    "## WORK EXPERIENCE",
    experiencesText,
    "## SKILLS SELF-ASSESSMENT",
    "### Strong",
    skillLines(strongSkills),
    "### Moderate",
    skillLines(moderateSkills),
    "### Gaps (BE UPFRONT ABOUT THESE)",
    skillLines(gapSkills),
    "## EXPLICIT GAPS & WEAKNESSES",
    gapsText,
    "## VALUES & CULTURE FIT",
    valuesText,
    "## PRE-WRITTEN ANSWERS",
    faqText,
    "## RESPONSE GUIDELINES",
    `- Speak in first person as ${profile.name}`,
    "- Be warm but direct",
    "- Keep responses concise unless detail is asked for",
    "- If you don't know something specific, say so",
    "- When discussing gaps, own them confidently",
    "- If someone asks about a role that's clearly not a fit, tell them directly"
  ].join("\n");
}

async function loadCandidateContext(client) {
  const profileResult = await client.query(
    `SELECT *
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
    `SELECT *
     FROM experiences
     WHERE candidate_id = $1
     ORDER BY display_order ASC, start_date DESC NULLS LAST`,
    [candidateId]
  );

  const skillsResult = await client.query(
    `SELECT *
     FROM skills
     WHERE candidate_id = $1
     ORDER BY category ASC, self_rating DESC NULLS LAST, skill_name ASC`,
    [candidateId]
  );

  const gapsResult = await client.query(
    `SELECT *
     FROM gaps_weaknesses
     WHERE candidate_id = $1
     ORDER BY id ASC`,
    [candidateId]
  );

  const valuesResult = await client.query(
    `SELECT *
     FROM values_culture
     WHERE candidate_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [candidateId]
  );

  const faqResult = await client.query(
    `SELECT *
     FROM faq_responses
     WHERE candidate_id = $1
     ORDER BY is_common_question DESC, id ASC`,
    [candidateId]
  );

  const aiInstructionsResult = await client.query(
    `SELECT *
     FROM ai_instructions
     WHERE candidate_id = $1
     ORDER BY priority ASC, id ASC`,
    [candidateId]
  );

  return {
    profile,
    experiences: experiencesResult.rows,
    skills: skillsResult.rows,
    gaps: gapsResult.rows,
    values: valuesResult.rows[0] || null,
    faq: faqResult.rows,
    aiInstructions: aiInstructionsResult.rows
  };
}

async function callAnthropic(systemPrompt, userMessage, apiKey) {
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
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage
          }
        ]
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
  return textBlock ? textBlock.text : "I do not have an answer for that yet.";
}

module.exports = async function(context, req) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const databaseUrl = process.env.DATABASE_URL;

    if (!apiKey) {
      context.res = {
        status: 500,
        body: { error: "ANTHROPIC_API_KEY is not configured" }
      };
      return;
    }

    if (!databaseUrl) {
      context.res = {
        status: 500,
        body: { error: "DATABASE_URL is not configured" }
      };
      return;
    }

    const userMessage = req && req.body && typeof req.body.message === "string"
      ? req.body.message.trim()
      : "";

    if (!userMessage) {
      context.res = {
        status: 400,
        body: { error: "Request body must include a non-empty 'message' string" }
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
    await client.connect();

    let assistantResponse;
    try {
      const contextPayload = await loadCandidateContext(client);
      const systemPrompt = buildPrompt(contextPayload);
      assistantResponse = await callAnthropic(systemPrompt, userMessage, apiKey);
    } finally {
      await client.end();
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { response: assistantResponse }
    };
  } catch (error) {
    context.log.error("chat function failed", error);
    const message = error && error.message ? error.message : "Unexpected chat error";
    const isTimeout = /timeout/i.test(message);
    context.res = {
      status: isTimeout ? 504 : 500,
      body: { error: message }
    };
  }
};
