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
