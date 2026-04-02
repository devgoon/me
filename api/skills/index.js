/**
 * @fileoverview Skills endpoint handler.
 * @module api/skills/index.js
 */

const { Client } = require('../db');
const { beginRequest, endRequest, failRequest, withRequestId } = require('../_shared/observability');

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 10000;

function normalizeSkillRow(row) {
  return {
    id: row.id,
    skillName: row.skill_name,
    category: row.category
  };
}

module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'skills.list');
  const databaseUrl = process.env.AZURE_DATABASE_URL;

  if (!databaseUrl) {
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'AZURE_DATABASE_URL is not configured' }
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

    // Load latest candidate id
    const profileRes = await client.query(
      `SELECT TOP 1 id FROM candidate_profile ORDER BY updated_at DESC, created_at DESC`
    );
    if (!profileRes.rows || profileRes.rows.length === 0) {
      context.res = {
        status: 404,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { error: 'No candidate profile found' }
      };
      endRequest(context, obs, 404);
      return;
    }
    const candidateId = profileRes.rows[0].id;

    const skillsRes = await client.query(
      `SELECT s.id, s.skill_name, s.category
       FROM skills s
       WHERE s.candidate_id = @p1
       ORDER BY s.category ASC, s.skill_name ASC`,
      [candidateId]
    );

    const strong = [];
    const moderate = [];
    (skillsRes.rows || []).forEach((r) => {
      const s = normalizeSkillRow(r);
      if (s.category === 'strong') strong.push(s.skillName);
      else if (s.category === 'moderate') moderate.push(s.skillName);
    });

    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { skills: { strong, moderate } }
    };
    endRequest(context, obs, 200);
  } catch (err) {
    failRequest(context, obs, err, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: err && err.message ? err.message : 'Failed to load skills' }
    };
  } finally {
    await client.end().catch(() => {});
  }
};
