/**
 * @fileoverview Skills endpoint handler.
 * @module api/skills/index.js
 */

const { Client } = require('../db');
const fs = require('fs');
const path = require('path');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 10000;
const STATIC_DEFAULT_DATA_PATH_CANDIDATES = [
  path.join(__dirname, '../../frontend-react/public/_shared/default-data.json'),
  path.join(process.cwd(), 'frontend-react/public/_shared/default-data.json'),
  path.join(process.cwd(), '_shared/default-data.json'),
  path.join(process.cwd(), 'frontend/_shared/default-data.json'),
];

function logInfo(context, message, meta) {
  try {
    if (context && context.log && typeof context.log.info === 'function') {
      context.log.info(message, meta || {});
    } else if (context && typeof context.log === 'function') {
      context.log(`${message} ${JSON.stringify(meta || {})}`);
    }
  } catch {
    // Best-effort logging only.
  }
}

function logWarn(context, message, meta) {
  try {
    if (context && context.log && typeof context.log.warn === 'function') {
      context.log.warn(message, meta || {});
    } else if (context && typeof context.log === 'function') {
      context.log(`${message} ${JSON.stringify(meta || {})}`);
    }
  } catch {
    // Best-effort logging only.
  }
}

function normalizeSkillRow(row) {
  const normalizedCategory = String(row.category || '')
    .trim()
    .toLowerCase();
  return {
    id: row.id,
    skillName: row.skill_name,
    category: normalizedCategory,
  };
}

function loadStaticDefaultData() {
  for (const filePath of STATIC_DEFAULT_DATA_PATH_CANDIDATES) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Continue trying other locations.
    }
  }
  return null;
}

function buildSkillsFallbackPayload() {
  const defaults = loadStaticDefaultData();
  const strong = Array.isArray(defaults && defaults.skills && defaults.skills.strong)
    ? defaults.skills.strong
    : [];
  const moderate = Array.isArray(defaults && defaults.skills && defaults.skills.moderate)
    ? defaults.skills.moderate
    : [];
  return { skills: { strong, moderate } };
}

function hasEmptySkillsPayload(payload) {
  const strong =
    payload && payload.skills && Array.isArray(payload.skills.strong) ? payload.skills.strong : [];
  const moderate =
    payload && payload.skills && Array.isArray(payload.skills.moderate)
      ? payload.skills.moderate
      : [];
  return strong.length === 0 && moderate.length === 0;
}

/**
 * Skills list endpoint. Returns categorized skill names for the latest candidate.
 *
 * @param {Object} context
 * @param {Object} req
 */
module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'skills.list');
  const databaseUrl = process.env.AZURE_DATABASE_URL;
  const fallbackBody = buildSkillsFallbackPayload();

  if (!databaseUrl) {
    logWarn(context, 'skills.list AZURE_DATABASE_URL missing, serving static fallback', {
      requestId: obs.requestId,
    });
    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: fallbackBody,
    };
    endRequest(context, obs, 200);
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
    logInfo(context, 'skills.list connected to database', { requestId: obs.requestId });

    // Prefer the latest profile that already has strong/moderate skills.
    // If none exists, fall back to the latest profile overall.
    const profileWithSkillsRes = await client.queryWithRetry(
      `SELECT TOP 1 cp.id
       FROM candidate_profile cp
       WHERE EXISTS (
         SELECT 1
         FROM skills s
         WHERE s.candidate_id = cp.id
           AND s.category IN ('strong', 'moderate')
       )
       ORDER BY cp.updated_at DESC, cp.created_at DESC`
    );

    let candidateId = profileWithSkillsRes.rows && profileWithSkillsRes.rows[0]?.id;
    let candidateSource = 'latest_with_skills';

    if (!candidateId) {
      const profileRes = await client.queryWithRetry(
        `SELECT TOP 1 id FROM candidate_profile ORDER BY updated_at DESC, created_at DESC`
      );
      candidateId = profileRes.rows && profileRes.rows[0]?.id;
      candidateSource = 'latest_profile_fallback';
    }

    logInfo(context, 'skills.list candidate selected', {
      requestId: obs.requestId,
      candidateId: candidateId || null,
      source: candidateSource,
    });

    if (!candidateId) {
      context.res = {
        status: 404,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { error: 'No candidate profile found' },
      };
      endRequest(context, obs, 404);
      return;
    }

    const skillsRes = await client.queryWithRetry(
      `SELECT s.id, s.skill_name, s.category
       FROM skills s
       WHERE s.candidate_id = @p1
       ORDER BY s.category ASC, s.skill_name ASC`,
      [candidateId]
    );

    const strong = [];
    const moderate = [];
    const unknownCategoryCounts = {};
    (skillsRes.rows || []).forEach((r) => {
      const s = normalizeSkillRow(r);
      if (s.category === 'strong') strong.push(s.skillName);
      else if (s.category === 'moderate') moderate.push(s.skillName);
      else {
        unknownCategoryCounts[s.category || '<empty>'] =
          (unknownCategoryCounts[s.category || '<empty>'] || 0) + 1;
      }
    });

    logInfo(context, 'skills.list assembled payload', {
      requestId: obs.requestId,
      candidateId,
      totalSkillRows: (skillsRes.rows || []).length,
      strongCount: strong.length,
      moderateCount: moderate.length,
      unknownCategoryCounts,
    });

    if (Object.keys(unknownCategoryCounts).length > 0) {
      logWarn(context, 'skills.list encountered uncategorized skill rows', {
        requestId: obs.requestId,
        candidateId,
        unknownCategoryCounts,
      });
    }

    let responseBody = { skills: { strong, moderate } };
    if (hasEmptySkillsPayload(responseBody) && !hasEmptySkillsPayload(fallbackBody)) {
      logWarn(context, 'skills.list empty DB payload, serving static fallback', {
        requestId: obs.requestId,
        candidateId,
      });
      responseBody = fallbackBody;
    }

    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: responseBody,
    };
    endRequest(context, obs, 200);
  } catch (err) {
    logWarn(context, 'skills.list error, serving static fallback', {
      requestId: obs.requestId,
      error: err && err.message ? err.message : String(err),
    });
    const fallbackIsEmpty = hasEmptySkillsPayload(fallbackBody);
    if (!fallbackIsEmpty) {
      context.res = {
        status: 200,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: fallbackBody,
      };
      endRequest(context, obs, 200);
      return;
    }

    failRequest(context, obs, err, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: {
        error:
          err && err.message
            ? err.message
            : 'The API is a bit cold. Please try refreshing the page in a few moments.',
      },
    };
  } finally {
    await client.end().catch(() => {});
  }
};
