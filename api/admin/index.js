/**
 * @fileoverview Admin API handlers.
 * @module api/admin/index.js
 */

const { Client } = require('../db');
const { getClientPrincipal } = require('../_shared/auth');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

const DB_CONNECT_TIMEOUT_MS = 5000;
const DB_QUERY_TIMEOUT_MS = 15000;

function asText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const t = String(value).trim();
  return t === '' ? null : t;
}

function asArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
    .filter(Boolean);
}

const { parsePgArray, safeParseJson } = require('../_shared/parse');

function coerceToNewlineString(v) {
  if (!v) return '';
  if (Array.isArray(v)) return v.join('\n');
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.join('\n') : Object.values(p).join('\n');
    } catch {
      // Try Postgres array literal
      const pg = parsePgArray(v);
      if (pg !== null) return pg.join('\n');
      return v
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join('\n');
    }
  }
  if (typeof v === 'object') return Object.values(v).map(String).join('\n');
  return String(v);
}

function coerceToArray(v) {
  if (Array.isArray(v)) return v;
  if (v === null || v === undefined) return [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return [];
    // Try JSON first
    const pj = safeParseJson(s);
    if (pj) {
      if (Array.isArray(pj)) return pj.map((x) => (x === null || x === undefined ? '' : String(x)));
      if (typeof pj === 'object' && pj !== null)
        return Object.values(pj).map(String).filter(Boolean);
    }
    // Try Postgres array literal
    const pg = parsePgArray(s);
    if (pg !== null) return pg;
    // split by newline or comma heuristics
    return s
      .split(/\r?\n|,\s*/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof v === 'object')
    return Object.values(v)
      .map((x) => (x === null || x === undefined ? '' : String(x)))
      .filter(Boolean);
  return [String(v)];
}

// asDate helper removed (unused)

function formatDateToYMD(value) {
  if (value === null || value === undefined || value === '') return '';
  // If already a YYYY-MM-DD string, return it
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // If ISO-like, take the first 10 chars
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  // If a Date object, format via toISOString
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  // Fallback: try to parse and format
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return '';
}

function formatDateToMDY(value) {
  if (value === null || value === undefined || value === '') return '';
  const ymd = formatDateToYMD(value);
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return '';
  return parts[1] + '/' + parts[2] + '/' + parts[0];
}

function formatMDYToYMD(value) {
  if (!value) return '';
  const s = String(value).trim();
  const m = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(s);
  if (!m) return '';
  const mm = m[1].padStart(2, '0');
  const dd = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function asNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === '') {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getDbClient() {
  const databaseUrl = process.env.AZURE_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('AZURE_DATABASE_URL is not configured');
  }

  return new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: DB_CONNECT_TIMEOUT_MS,
    query_timeout: DB_QUERY_TIMEOUT_MS,
    statement_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function requireAuth(req) {
  const principal = getClientPrincipal(req);
  if (principal && principal.email) {
    return principal;
  }

  return null;
}

function mapGapType(input) {
  const value = String(input || '').toLowerCase();
  if (value === 'skill gap' || value === 'skill') return 'skill';
  if (value === 'experience gap' || value === 'experience') return 'experience';
  if (value === 'environment mismatch' || value === 'environment') return 'environment';
  if (value === 'role type mismatch' || value === 'role_type') return 'role_type';
  return 'skill';
}

function mapInstructionType(input) {
  const value = String(input || '').toLowerCase();
  if (value === 'tone') return 'tone';
  if (value === 'boundaries') return 'boundaries';
  return 'honesty';
}

function mapSkillCategory(input) {
  const value = String(input || '').toLowerCase();
  if (value === 'strong') return 'strong';
  if (value === 'moderate') return 'moderate';
  if (value === 'gap') return 'gap';
  return 'strong';
}

async function resolveCandidate(client, email, profile) {
  const existing = await client.query(
    `SELECT TOP 1 id
     FROM candidate_profile
     WHERE LOWER(email) = LOWER(@p1)`,
    [email]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO candidate_profile (name, email)
     OUTPUT INSERTED.id
     VALUES (@p1, @p2)`,
    [asText(profile.fullName) || email.split('@')[0], email]
  );

  return inserted.rows[0].id;
}

async function loadAll(client, candidateId) {
  const profileRes = await client.query(
    `SELECT TOP 1 *
     FROM candidate_profile
     WHERE id = @p1`,
    [candidateId]
  );

  const expRes = await client.query(
    `SELECT *
     FROM experiences
     WHERE candidate_id = @p1
     ORDER BY CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
    [candidateId]
  );

  const skillsRes = await client.query(
    `SELECT *
     FROM skills
     WHERE candidate_id = @p1
     ORDER BY category ASC, CASE WHEN self_rating IS NULL THEN 1 ELSE 0 END ASC, self_rating DESC, skill_name ASC`,
    [candidateId]
  );

  const gapsRes = await client.query(
    `SELECT *
     FROM gaps_weaknesses
     WHERE candidate_id = @p1
     ORDER BY id ASC`,
    [candidateId]
  );

  const educationRes = await client.query(
    `SELECT *
     FROM education
     WHERE candidate_id = @p1
     ORDER BY display_order ASC, CASE WHEN start_date IS NULL THEN 1 ELSE 0 END ASC, start_date DESC`,
    [candidateId]
  );

  let certRes = { rows: [] };
  try {
    certRes = (await client.query(
      `SELECT *
       FROM certifications
       WHERE candidate_id = @p1
       ORDER BY display_order ASC, CASE WHEN issue_date IS NULL THEN 1 ELSE 0 END ASC, issue_date DESC`,
      [candidateId]
    )) || { rows: [] };
  } catch {
    certRes = { rows: [] };
  }

  const valuesRes = await client.query(
    `SELECT TOP 1 *
     FROM values_culture
     WHERE candidate_id = @p1
     ORDER BY created_at DESC`,
    [candidateId]
  );

  const faqRes = await client.query(
    `SELECT *
     FROM faq_responses
     WHERE candidate_id = @p1
     ORDER BY is_common_question DESC, id ASC`,
    [candidateId]
  );

  const insRes = await client.query(
    `SELECT *
     FROM ai_instructions
     WHERE candidate_id = @p1
     ORDER BY priority ASC, id ASC`,
    [candidateId]
  );

  const profile = profileRes.rows[0] || {};
  const values = valuesRes.rows[0] || {};

  let honestyLevel = 7;
  const rules = [];
  for (const row of insRes.rows) {
    if (row.instruction && String(row.instruction).startsWith('HONESTY_LEVEL:')) {
      const parsed = Number(String(row.instruction).split(':')[1]);
      if (Number.isFinite(parsed)) {
        honestyLevel = Math.min(10, Math.max(1, parsed));
      }
      continue;
    }

    rules.push({
      instructionType: row.instruction_type,
      instruction: row.instruction,
      priority: row.priority,
    });
  }

  return {
    profile: {
      fullName: profile.name || '',
      email: profile.email || '',
      currentTitle: profile.title || '',
      targetTitles: coerceToArray(profile.target_titles),
      targetCompanyStages: coerceToArray(profile.target_company_stages),
      elevatorPitch: profile.elevator_pitch || '',
      careerNarrative: profile.career_narrative || '',
      lookingFor: profile.looking_for || '',
      notLookingFor: profile.not_looking_for || '',
      managementStyle: profile.management_style || '',
      workStylePreferences: profile.work_style || '',
      salaryMin: profile.salary_min || '',
      salaryMax: profile.salary_max || '',
      availabilityStatus: profile.availability_status || '',
      availableStarting: formatDateToYMD(profile.availability_date),
      location: profile.location || '',
      remotePreference: profile.remote_preference || '',
      linkedInUrl: profile.linkedin_url || '',
      githubUrl: profile.github_url || '',
    },
    experiences: expRes.rows.map((row) => ({
      companyName: row.company_name || '',
      title: row.title || '',
      titleProgression: row.title_progression || '',
      startDate: formatDateToYMD(row.start_date),
      endDate: formatDateToYMD(row.end_date),
      current: Boolean(row.is_current),
      achievementBullets: coerceToArray(row.bullet_points),
      whyJoined: row.why_joined || '',
      whyLeft: row.why_left || '',
      actualContributions: row.actual_contributions || '',
      proudestAchievement: row.proudest_achievement || '',
      wouldDoDifferently: row.would_do_differently || '',
      hardOrFrustrating: row.challenges_faced || '',
      lessonsLearned: row.lessons_learned || '',
      managerDescribe: row.manager_would_say || '',
      reportsDescribe: row.reports_would_say || '',
      conflictsChallenges: row.challenges_faced || '',
      quantifiedImpact: (() => {
        if (!row.quantified_impact && row.quantified_impact !== 0) return '';
        if (typeof row.quantified_impact === 'object')
          return JSON.stringify(row.quantified_impact, null, 2);
        // try parsing stored string as JSON
        const parsed = safeParseJson(String(row.quantified_impact));
        if (parsed) return JSON.stringify(parsed, null, 2);
        return String(row.quantified_impact);
      })(),
      displayOrder: row.display_order || 0,
    })),
    skills: skillsRes.rows.map((row) => ({
      skillName: row.skill_name || '',
      category: row.category || 'strong',
      selfRating: row.self_rating || 3,
      evidence: row.evidence || '',
      honestNotes: row.honest_notes || '',
      yearsExperience: row.years_experience || '',
      lastUsed: formatDateToYMD(row.last_used),
      lastUsedDisplay: formatDateToMDY(row.last_used),
    })),
    gaps: gapsRes.rows.map((row) => ({
      gapType: row.gap_type || 'skill',
      description: row.description || '',
      whyItsAGap: row.why_its_a_gap || '',
      interestedInLearning: Boolean(row.interest_in_learning),
    })),
    education: educationRes.rows.map((row) => ({
      institution: row.institution || '',
      degree: row.degree || '',
      fieldOfStudy: row.field_of_study || '',
      startDate: formatDateToYMD(row.start_date),
      endDate: formatDateToYMD(row.end_date),
      current: Boolean(row.is_current),
      grade: row.grade || '',
      notes: row.notes || '',
      displayOrder: row.display_order || 0,
    })),
    certifications: certRes.rows.map((row) => ({
      name: row.name || '',
      issuer: row.issuer || '',
      issueDate: formatDateToYMD(row.issue_date),
      expirationDate: formatDateToYMD(row.expiration_date),
      credentialId: row.credential_id || '',
      verificationUrl: row.verification_url || '',
      notes: row.notes || '',
      displayOrder: row.display_order || 0,
    })),
    valuesCulture: {
      mustHaves: coerceToNewlineString(values.must_haves),
      dealbreakers: coerceToNewlineString(values.dealbreakers),
      managementStylePreferences: values.management_style_preferences || '',
      teamSizePreferences: values.team_size_preferences || '',
      howHandleConflict: values.how_handle_conflict || '',
      howHandleAmbiguity: values.how_handle_ambiguity || '',
      howHandleFailure: values.how_handle_failure || '',
    },
    faq: faqRes.rows.map((row) => ({
      question: row.question || '',
      answer: row.answer || '',
      isCommonQuestion: Boolean(row.is_common_question),
    })),
    aiInstructions: {
      honestyLevel,
      rules,
    },
  };
}

async function saveAll(client, candidateId, payload, authEmail) {
  const profile = payload.profile || {};
  const experiences = Array.isArray(payload.experiences) ? payload.experiences : [];
  const skills = Array.isArray(payload.skills) ? payload.skills : [];
  const education = Array.isArray(payload.education) ? payload.education : [];
  const gaps = Array.isArray(payload.gaps) ? payload.gaps : [];
  const valuesCulture = payload.valuesCulture || {};
  const faq = Array.isArray(payload.faq) ? payload.faq : [];
  const aiInstructions = payload.aiInstructions || {};
  const safeEmail =
    asText(profile.email) || String(authEmail || '').toLowerCase() || 'admin@example.com';
  const safeName = asText(profile.fullName) || safeEmail.split('@')[0] || 'Admin';
  const salaryMinValue = asNumber(profile.salaryMin);
  const salaryMaxValue = asNumber(profile.salaryMax);

  if (salaryMinValue !== null && salaryMaxValue !== null && salaryMinValue > salaryMaxValue) {
    throw new Error('Salary min cannot be greater than salary max');
  }

  console.log(`[admin.saveAll] BEGIN TRANSACTION candidateId=${candidateId}`);
  await client.beginTransaction();
  try {
    await client.query(
      `UPDATE candidate_profile
       SET
         updated_at = GETUTCDATE(),
         name = @p2,
         email = @p3,
         title = @p4,
         target_titles = @p5,
         target_company_stages = @p6,
         elevator_pitch = @p7,
         career_narrative = @p8,
         looking_for = @p9,
         not_looking_for = @p10,
         management_style = @p11,
         work_style = @p12,
         salary_min = @p13,
         salary_max = @p14,
         availability_status = @p15,
         availability_date = @p16,
         location = @p17,
         remote_preference = @p18,
         linkedin_url = @p19,
         github_url = @p20
       WHERE id = @p1`,
      [
        candidateId,
        safeName,
        safeEmail,
        asText(profile.currentTitle),
        asArray(profile.targetTitles),
        asArray(profile.targetCompanyStages),
        asText(profile.elevatorPitch),
        asText(profile.careerNarrative),
        asText(profile.lookingFor),
        asText(profile.notLookingFor),
        asText(profile.managementStyle),
        asText(profile.workStylePreferences),
        salaryMinValue,
        salaryMaxValue,
        asText(profile.availabilityStatus),
        formatDateToYMD(profile.availableStarting) || null,
        asText(profile.location),
        asText(profile.remotePreference),
        asText(profile.linkedInUrl),
        asText(profile.githubUrl),
      ]
    );

    // Only require companyName (company_name is NOT NULL in the DB). Titles may be empty.
    // Upsert each experience row to preserve existing records and avoid unique-key conflicts.
    const validExperiences = experiences.filter((item) => asText(item.companyName));
    for (const [index, item] of validExperiences.entries()) {
      let impactJson = null;
      const rawImpact = asText(item.quantifiedImpact);
      if (rawImpact) {
        try {
          impactJson = JSON.parse(rawImpact);
        } catch {
          impactJson = { note: rawImpact };
        }
      }

      const _startDate = formatDateToYMD(item.startDate) || null;
      const _endDate = item.current ? null : formatDateToYMD(item.endDate) || null;

      await client.query(
        `MERGE INTO experiences AS target
         USING (VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19))
           AS src(candidate_id, company_name, title, title_progression, start_date, end_date, is_current, bullet_points, why_joined, why_left, actual_contributions, proudest_achievement, would_do_differently, challenges_faced, lessons_learned, manager_would_say, reports_would_say, quantified_impact, display_order)
         ON target.candidate_id = src.candidate_id AND target.company_name = src.company_name AND target.start_date = src.start_date
         WHEN MATCHED THEN
           UPDATE SET
             title = src.title,
             title_progression = src.title_progression,
             end_date = src.end_date,
             is_current = src.is_current,
             bullet_points = src.bullet_points,
             why_joined = src.why_joined,
             why_left = src.why_left,
             actual_contributions = src.actual_contributions,
             proudest_achievement = src.proudest_achievement,
             would_do_differently = src.would_do_differently,
             challenges_faced = src.challenges_faced,
             lessons_learned = src.lessons_learned,
             manager_would_say = src.manager_would_say,
             reports_would_say = src.reports_would_say,
             quantified_impact = src.quantified_impact,
             display_order = src.display_order
         WHEN NOT MATCHED BY TARGET THEN
           INSERT (candidate_id, company_name, title, title_progression, start_date, end_date, is_current, bullet_points, why_joined, why_left, actual_contributions, proudest_achievement, would_do_differently, challenges_faced, lessons_learned, manager_would_say, reports_would_say, quantified_impact, display_order)
           VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10,@p11,@p12,@p13,@p14,@p15,@p16,@p17,@p18,@p19);`,
        [
          candidateId,
          asText(item.companyName),
          asText(item.title),
          asText(item.titleProgression),
          _startDate,
          _endDate,
          Boolean(item.current),
          asArray(item.achievementBullets),
          asText(item.whyJoined),
          asText(item.whyLeft),
          asText(item.actualContributions),
          asText(item.proudestAchievement),
          asText(item.wouldDoDifferently),
          asText(item.hardOrFrustrating || item.conflictsChallenges),
          asText(item.lessonsLearned),
          asText(item.managerDescribe),
          asText(item.reportsDescribe),
          impactJson,
          Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index,
        ]
      );
    }

    await client.query('DELETE FROM skills WHERE candidate_id = @p1', [candidateId]);
    const validSkills = skills.filter((item) => asText(item.skillName));
    for (const item of validSkills) {
      // Normalize lastUsed: prefer canonical YMD, fall back to MDY display if provided
      const normalizedLastUsed =
        formatDateToYMD(item.lastUsed) || formatMDYToYMD(item.lastUsedDisplay || '') || null;
      await client.query(
        `INSERT INTO skills (
          candidate_id, skill_name, category, self_rating, evidence, honest_notes, years_experience, last_used
        ) VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)`,
        [
          candidateId,
          asText(item.skillName),
          mapSkillCategory(item.category),
          asNumber(item.selfRating),
          asText(item.evidence),
          asText(item.honestNotes),
          asNumber(item.yearsExperience),
          normalizedLastUsed,
        ]
      );
    }

    await client.query('DELETE FROM gaps_weaknesses WHERE candidate_id = @p1', [candidateId]);
    const validGaps = gaps.filter((item) => asText(item.description));
    for (const item of validGaps) {
      await client.query(
        `INSERT INTO gaps_weaknesses (candidate_id, gap_type, description, why_its_a_gap, interest_in_learning)
         VALUES (@p1, @p2, @p3, @p4, @p5)`,
        [
          candidateId,
          mapGapType(item.gapType),
          asText(item.description),
          asText(item.whyItsAGap),
          Boolean(item.interestedInLearning),
        ]
      );
    }

    await client.query('DELETE FROM education WHERE candidate_id = @p1', [candidateId]);
    const validEducation = education.filter(
      (item) => asText(item.institution) || asText(item.degree)
    );
    for (const [index, item] of validEducation.entries()) {
      await client.query(
        `INSERT INTO education (
          candidate_id, institution, degree, field_of_study, start_date, end_date, is_current, grade, notes, display_order
        ) VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9,@p10)`,
        [
          candidateId,
          asText(item.institution),
          asText(item.degree),
          asText(item.fieldOfStudy),
          formatDateToYMD(item.startDate) || null,
          item.current ? null : formatDateToYMD(item.endDate) || null,
          Boolean(item.current),
          asText(item.grade),
          asText(item.notes),
          Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index,
        ]
      );
    }

    // Certifications
    await client.query('DELETE FROM certifications WHERE candidate_id = @p1', [candidateId]);
    const validCerts = Array.isArray(payload.certifications)
      ? payload.certifications.filter((c) => asText(c.name))
      : [];
    for (const [index, item] of validCerts.entries()) {
      await client.query(
        `INSERT INTO certifications (
          candidate_id, name, issuer, issue_date, expiration_date, credential_id, verification_url, notes, display_order
        ) VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9)`,
        [
          candidateId,
          asText(item.name),
          asText(item.issuer),
          formatDateToYMD(item.issueDate) || null,
          formatDateToYMD(item.expirationDate) || null,
          asText(item.credentialId),
          asText(item.verificationUrl),
          asText(item.notes),
          Number.isFinite(Number(item.displayOrder)) ? Number(item.displayOrder) : index,
        ]
      );
    }

    await client.query('DELETE FROM values_culture WHERE candidate_id = @p1', [candidateId]);
    await client.query(
      `INSERT INTO values_culture (
        candidate_id, must_haves, dealbreakers, management_style_preferences,
        team_size_preferences, how_handle_conflict, how_handle_ambiguity, how_handle_failure
      ) VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)`,
      [
        candidateId,
        asArray(String(valuesCulture.mustHaves || '').split(/\r?\n/)),
        asArray(String(valuesCulture.dealbreakers || '').split(/\r?\n/)),
        asText(valuesCulture.managementStylePreferences),
        asText(valuesCulture.teamSizePreferences),
        asText(valuesCulture.howHandleConflict),
        asText(valuesCulture.howHandleAmbiguity),
        asText(valuesCulture.howHandleFailure),
      ]
    );

    await client.query('DELETE FROM faq_responses WHERE candidate_id = @p1', [candidateId]);
    const validFaq = faq.filter((item) => asText(item.question) || asText(item.answer));
    for (const item of validFaq) {
      await client.query(
        `INSERT INTO faq_responses (candidate_id, question, answer, is_common_question)
         VALUES (@p1, @p2, @p3, @p4)`,
        [
          candidateId,
          String(item.question || '').trim(),
          String(item.answer || '').trim(),
          Boolean(item.isCommonQuestion),
        ]
      );
    }

    await client.query('DELETE FROM ai_instructions WHERE candidate_id = @p1', [candidateId]);

    const honestyLevel = Number(aiInstructions.honestyLevel || 7);
    await client.query(
      `INSERT INTO ai_instructions (candidate_id, instruction_type, instruction, priority)
       VALUES (@p1, 'honesty', @p2, 0)`,
      [candidateId, `HONESTY_LEVEL:${Math.min(10, Math.max(1, Math.round(honestyLevel)))}`]
    );

    const rules = Array.isArray(aiInstructions.rules) ? aiInstructions.rules : [];
    for (const [index, item] of rules.entries()) {
      if (!asText(item.instruction)) {
        continue;
      }
      await client.query(
        `INSERT INTO ai_instructions (candidate_id, instruction_type, instruction, priority)
         VALUES (@p1, @p2, @p3, @p4)`,
        [
          candidateId,
          mapInstructionType(item.instructionType),
          asText(item.instruction),
          Number.isFinite(Number(item.priority)) ? Number(item.priority) : (index + 1) * 10,
        ]
      );
    }

    await client.commitTransaction();
  } catch (error) {
    console.error('[admin.saveAll] error', error && error.stack ? error.stack : error);
    try {
      await client.rollbackTransaction();
    } catch (rbErr) {
      console.error('[admin.saveAll] rollback error', rbErr && rbErr.stack ? rbErr.stack : rbErr);
    }
    throw error;
  }
}

module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'admin.panel');
  const auth = requireAuth(req);
  if (!auth) {
    context.res = {
      status: 401,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'Unauthorized' },
    };
    endRequest(context, obs, 401);
    return;
  }

  let client;
  try {
    client = getDbClient();
    await client.connect();

    const candidateId = await resolveCandidate(
      client,
      String(auth.email).toLowerCase(),
      req.body && req.body.profile ? req.body.profile : {}
    );

    if (String(req.method || '').toUpperCase() === 'GET') {
      const data = await loadAll(client, candidateId);
      context.res = {
        status: 200,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: data,
      };
      endRequest(context, obs, 200);
      return;
    }

    if (String(req.method || '').toUpperCase() === 'POST') {
      await saveAll(client, candidateId, req.body || {}, String(auth.email).toLowerCase());
      // Invalidate AI cache after profile updates that affect generated responses
      try {
        if (module.exports && typeof module.exports.hideCacheRecords === 'function') {
          await module.exports.hideCacheRecords(client);
        }
      } catch (err) {
        console.error('Error invalidating cache records:', err && err.stack ? err.stack : err);
      }
      context.res = {
        status: 200,
        headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
        body: { ok: true },
      };
      endRequest(context, obs, 200);
      return;
    }

    context.res = {
      status: 405,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'Method not allowed' },
    };
    endRequest(context, obs, 405);
  } catch (error) {
    failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: error.message || 'Admin operation failed' },
    };
  } finally {
    if (client) {
      await client.end().catch(() => {});
    }
  }
};

// Cache report endpoint
module.exports.cacheReport = async function (context, req) {
  const obs = beginRequest(context, req, 'admin.cacheReport');
  const auth = requireAuth(req);
  if (!auth) {
    context.res = {
      status: 401,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: 'Unauthorized' },
    };
    endRequest(context, obs, 401);
    return;
  }
  const client = getDbClient();
  await client.connect();
  try {
    const result = await client.query(
      `SELECT question, model, cache_hit_count, last_accessed, is_cached, invalidated_at
         FROM ai_response_cache
         ORDER BY cache_hit_count DESC, last_accessed DESC`
    );
    // Map DB fields to frontend keys
    const mappedRows = result.rows.map((row) => ({
      question: row.question,
      model: row.model,
      cached: row.cache_hit_count,
      lastAccessed: row.last_accessed,
      invalidatedAt: row.invalidated_at || null,
      hidden: !row.is_cached,
    }));
    context.res = {
      status: 200,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: mappedRows,
    };
    endRequest(context, obs, 200);
  } catch {
    failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: error.message || 'Cache report error' },
    };
  } finally {
    await client.end();
  }
};

module.exports.hideCacheRecords = async function (client) {
  await client.query(
    `UPDATE ai_response_cache SET is_cached = FALSE, invalidated_at = GETUTCDATE() WHERE is_cached = TRUE`
  );
};
