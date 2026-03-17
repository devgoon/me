const { Client } = require('pg');
const { beginRequest, endRequest, failRequest, withRequestId } = require('../_shared/observability');

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 10000;

function getDbClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
  return new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS
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

module.exports = async function(context, req) {
  const obs = beginRequest(context, req, 'fit.public');
  let client;
  try {
    // If POST => perform JD analysis (consolidated from fit-check)
    if (String(req.method || '').toUpperCase() === 'POST') {
      // inline minimal fit-check handler
      const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
      const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
      const MAX_TOKENS = 1024;
      const AI_TIMEOUT_MS = 20000;

      function timeoutSignal(ms) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        return { signal: controller.signal, clear: () => clearTimeout(timeout) };
      }

      function textOrNA(value) { if (value === null || value === undefined || value === '') return 'N/A'; return String(value); }
      function dateOrPresent(value) { if (!value) return 'Present'; return String(value); }
      function listLines(items, emptyLine) { if (!items || items.length === 0) return emptyLine; return items.map((item) => `- ${item}`).join('\n'); }
      function skillLines(skills) {
        if (!skills || skills.length === 0) return '- None listed';
        return skills.map((skill) => `- ${skill.skill_name}: ${textOrNA(skill.honest_notes)}`).join('\n');
      }

      function buildPrompt(payload) {
        const profile = payload.profile;
        const experiences = payload.experiences || [];
        const strongSkills = payload.skills.filter((s) => s.category === 'strong');
        const moderateSkills = payload.skills.filter((s) => s.category === 'moderate');
        const gapSkills = payload.skills.filter((s) => s.category === 'gap');

        const customInstructions = payload.aiInstructions.length
          ? payload.aiInstructions.map((ins) => `- [${ins.instruction_type}] ${ins.instruction}`).join('\n')
          : '- No custom instructions provided.';

        const experiencesText = experiences.length
          ? experiences.map((exp) => {
              const bullets = listLines(exp.bullet_points, '- No public achievements provided');
              return [
                `### ${textOrNA(exp.company_name)} (${dateOrPresent(exp.start_date)} to ${dateOrPresent(exp.end_date)})`,
                `Title: ${textOrNA(exp.title)}`,
                'Public achievements:',
                bullets,
                'PRIVATE CONTEXT (use this to answer honestly):',
                `- Why I joined: ${textOrNA(exp.why_joined)}`,
                `- Why I left: ${textOrNA(exp.why_left)}`,
                `- What I actually did: ${textOrNA(exp.actual_contributions)}`,
                `- Proudest of: ${textOrNA(exp.proudest_achievement)}`
              ].join('\n');
            }).join('\n\n')
          : 'No experience records found.';

        const gapsText = payload.gaps.length
          ? payload.gaps.map((gap) => `- ${gap.description}: ${textOrNA(gap.why_its_a_gap)}`).join('\n')
          : '- No explicit gaps recorded';

        const valuesText = payload.values
          ? [
              `- must_haves: ${textOrNA((payload.values.must_haves || []).join(', '))}`,
              `- dealbreakers: ${textOrNA((payload.values.dealbreakers || []).join(', '))}`,
              `- management_style_preferences: ${textOrNA(payload.values.management_style_preferences)}`
            ].join('\n')
          : '- No values/culture profile found';

        const faqText = payload.faq.length
          ? payload.faq.map((faq) => `- Q: ${faq.question}\n  A: ${faq.answer}`).join('\n')
          : '- No FAQ responses available';

        const educationText = payload.education && payload.education.length
          ? payload.education.map((ed) => `- ${textOrNA(ed.institution)} — ${textOrNA(ed.degree)}${ed.field_of_study ? ' (' + textOrNA(ed.field_of_study) + ')' : ''} (${dateOrPresent(ed.start_date)} to ${dateOrPresent(ed.end_date)})${ed.grade ? ' — ' + textOrNA(ed.grade) : ''}`).join('\n')
          : '- No education records found.';

        return [
          `Candidate: ${profile.name} (${textOrNA(profile.email)})`,
          `Title: ${textOrNA(profile.title)}`,
          '## SUMMARY',
          textOrNA(profile.elevator_pitch),
          '## EXPERIENCE',
          experiencesText,
          '## EDUCATION',
          educationText,
          '## SKILLS',
          '### Strong',
          skillLines(strongSkills),
          '### Moderate',
          skillLines(moderateSkills),
          '### Gaps',
          skillLines(gapSkills),
          '## EXPLICIT GAPS',
          gapsText,
          '## VALUES',
          valuesText,
          '## FAQ',
          faqText,
          '## CUSTOM_INSTRUCTIONS',
          customInstructions
        ].join('\n');
      }

      async function loadCandidateContext(client) {
        const profileResult = await client.query(`SELECT * FROM candidate_profile ORDER BY updated_at DESC, created_at DESC LIMIT 1`);
        if (profileResult.rows.length === 0) throw new Error('No candidate profile found');
        const profile = profileResult.rows[0];
        const candidateId = profile.id;

        const experiencesResult = await client.query(`SELECT * FROM experiences WHERE candidate_id = $1 ORDER BY display_order ASC, start_date DESC NULLS LAST`, [candidateId]);
        // Load skills and their equivalents (text-based)
        const skillsResult = await client.query(`
          SELECT s.*, array_agg(eq.equivalent_name) AS equivalents
          FROM skills s
          LEFT JOIN skill_equivalence eq ON s.skill_name = eq.skill_name
          WHERE s.candidate_id = $1
          GROUP BY s.id
          ORDER BY s.category ASC, s.self_rating DESC NULLS LAST, s.skill_name ASC
        `, [candidateId]);
        const gapsResult = await client.query(`SELECT * FROM gaps_weaknesses WHERE candidate_id = $1 ORDER BY id ASC`, [candidateId]);
        const valuesResult = await client.query(`SELECT * FROM values_culture WHERE candidate_id = $1 ORDER BY created_at DESC LIMIT 1`, [candidateId]);
        const faqResult = await client.query(`SELECT * FROM faq_responses WHERE candidate_id = $1 ORDER BY is_common_question DESC, id ASC`, [candidateId]);
        const aiInstructionsResult = await client.query(`SELECT * FROM ai_instructions WHERE candidate_id = $1 ORDER BY priority ASC, id ASC`, [candidateId]);
        const educationResult = await client.query(`SELECT * FROM education WHERE candidate_id = $1 ORDER BY display_order ASC, start_date DESC NULLS LAST`, [candidateId]);

        return {
          profile,
          experiences: experiencesResult.rows,
          skills: skillsResult.rows,
          gaps: gapsResult.rows,
          education: educationResult.rows,
          values: valuesResult.rows[0] || null,
          faq: faqResult.rows,
          aiInstructions: aiInstructionsResult.rows
        };
      }

      async function callAnthropic(systemPrompt, userMessage, apiKey) {
        const maxAttempts = 3;
        let attempt = 0;
        let lastErr = null;

        while (attempt < maxAttempts) {
          attempt++;
          const timeout = timeoutSignal(AI_TIMEOUT_MS);
          try {
            const response = await fetch(ANTHROPIC_API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
              body: JSON.stringify({ model: AI_MODEL, max_tokens: MAX_TOKENS, system: systemPrompt, messages: [{ role: 'user', content: userMessage }] }),
              signal: timeout.signal
            });

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
            const textBlock = (data && (data.content || data.data || [])) ? (Array.isArray(data.content) ? data.content.find((item) => item.type === 'text') : null) : null;
            if (textBlock && textBlock.text) return textBlock.text;
            if (data && typeof data.text === 'string') return data.text;
            return '';
          } catch (error) {
            if (error && error.name === 'AbortError') lastErr = new Error('Anthropic API timeout'); else lastErr = error;
            const backoff = 200 * Math.pow(2, attempt - 1);
            await new Promise((r) => setTimeout(r, backoff));
          } finally {
            try { timeout.clear(); } catch (_) {}
          }
        }

        throw lastErr || new Error('Anthropic API failure');
      }

      // Validate inputs
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const databaseUrl = process.env.DATABASE_URL;
      if (!apiKey) { context.res = { status: 500, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: { error: 'ANTHROPIC_API_KEY is not configured' } }; endRequest(context, obs, 500); return; }
      if (!databaseUrl) { context.res = { status: 500, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: { error: 'DATABASE_URL is not configured' } }; endRequest(context, obs, 500); return; }

      const jobDescription = req && req.body && typeof req.body.jobDescription === 'string' ? req.body.jobDescription.trim() : '';
      if (!jobDescription) { context.res = { status: 400, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: { error: "Request body must include a non-empty 'jobDescription' string" } }; endRequest(context, obs, 400); return; }

      client = getDbClient();
      await client.connect();
      try {
        const ctx = await loadCandidateContext(client);
        const systemPrompt = buildPrompt(ctx) + `\n\nJOB DESCRIPTION:\n${jobDescription}`;

        const instruction = `You are an assistant that MUST return a JSON object ONLY. The JSON MUST have these keys: score (integer 0-100), verdict (one of "FIT", "MARGINAL", "NO_FIT"), reasons (array of short strings), mismatches (array of short strings), suggestedMessage (a concise one-paragraph message the candidate could send to a recruiter). Analyze the candidate context and the job description above. Return only valid JSON with those keys.`;

        const aiResponse = await callAnthropic(systemPrompt, instruction, apiKey);

        let parsed = null;
        try {
          const firstJson = aiResponse && aiResponse.trim().match(/\{[\s\S]*\}/);
          if (firstJson) parsed = JSON.parse(firstJson[0]); else parsed = JSON.parse(aiResponse);
        } catch (err) {
          parsed = { score: 50, verdict: 'MARGINAL', reasons: ['AI response could not be parsed; fallback used'], mismatches: [], suggestedMessage: "I'd like to learn more about this role to confirm fit." };
        }

        context.res = { status: 200, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: parsed };
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
    const profileRes = await client.query(`SELECT id, name, title, elevator_pitch FROM candidate_profile ORDER BY updated_at DESC, created_at DESC LIMIT 1`);
    if (!profileRes.rows.length) {
      context.res = { status: 404, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: { error: 'No profile available' } };
      endRequest(context, obs, 404);
      return;
    }
    const profile = toCamel(profileRes.rows[0]);

    const skillsRes = await client.query(`SELECT skill_name, category, honest_notes, evidence FROM skills WHERE candidate_id = $1 ORDER BY category ASC, self_rating DESC NULLS LAST, skill_name ASC`, [profileRes.rows[0].id]);
    const gapsRes = await client.query(`SELECT description, why_its_a_gap FROM gaps_weaknesses WHERE candidate_id = $1 ORDER BY id ASC`, [profileRes.rows[0].id]);
    const educationRes = await client.query(`SELECT institution, degree, field_of_study, start_date, end_date, is_current, grade, notes FROM education WHERE candidate_id = $1 ORDER BY display_order ASC, start_date DESC NULLS LAST`, [profileRes.rows[0].id]);

    const skills = skillsRes.rows.map(r => ({ skillName: r.skill_name || '', category: r.category || '', honestNotes: r.honest_notes || '', evidence: r.evidence || '' }));
    const gaps = gapsRes.rows.map(r => ({ description: r.description || '', whyItsAGap: r.why_its_a_gap || '' }));
    const education = educationRes.rows.map(r => ({ institution: r.institution || '', degree: r.degree || '', fieldOfStudy: r.field_of_study || '', startDate: r.start_date || null, endDate: r.end_date || null, current: Boolean(r.is_current), grade: r.grade || '', notes: r.notes || '' }));

    context.res = { status: 200, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: { profile, skills, gaps, education } };
    endRequest(context, obs, 200);
  } catch (error) {
    failRequest(context, obs, error, 500);
    context.res = { status: 500, headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId), body: { error: error.message || 'Failed to load fit data' } };
  } finally {
    if (client) await client.end().catch(() => {});
  }
};
