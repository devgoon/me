import { ADMIN_DEFAULT_FAQ, ADMIN_INITIAL_STATE } from './state.js';

/**
 * Normalize incoming admin panel payload into the UI model shape.
 * Ensures default fields are present and maps legacy keys.
 *
 * @param {Object} data - Raw payload returned from the API.
 * @returns {Object} Normalized admin data.
 */
export function normalizeAdminIncoming(data) {
  const payload = { ...ADMIN_INITIAL_STATE, ...(data || {}) };
  payload.profile = { ...ADMIN_INITIAL_STATE.profile, ...(data?.profile || {}) };
  payload.valuesCulture = { ...ADMIN_INITIAL_STATE.valuesCulture, ...(data?.valuesCulture || {}) };
  payload.aiInstructions = {
    ...ADMIN_INITIAL_STATE.aiInstructions,
    ...(data?.aiInstructions || {}),
    honestyLevel: Number(data?.aiInstructions?.honestyLevel || 7),
    rules: Array.isArray(data?.aiInstructions?.rules) ? data.aiInstructions.rules : [],
  };
  payload.faq = Array.isArray(data?.faq)
    ? data.faq.map((item) => ({
        ...item,
        question: item?.question || item?.q || '',
        answer: item?.answer || item?.a || '',
      }))
    : ADMIN_DEFAULT_FAQ;
  payload.education = Array.isArray(data?.education)
    ? data.education.map((item) => ({
        ...item,
        institution: item?.institution || item?.school || '',
      }))
    : [];
  payload.experiences = Array.isArray(data?.experiences) ? data.experiences : [];
  payload.skills = Array.isArray(data?.skills) ? data.skills : [];
  payload.gaps = Array.isArray(data?.gaps) ? data.gaps : [];
  payload.certifications = Array.isArray(data?.certifications) ? data.certifications : [];
  payload.allFields = data?.allFields || {};
  return payload;
}

/**
 * Prepare admin payload for saving: strip empty entries and normalize
 * field names expected by the server.
 *
 * @param {Object} payload - Admin UI model.
 * @returns {Object} Sanitized payload ready for JSON serialization.
 */
export function sanitizeForSave(payload) {
  const out = JSON.parse(JSON.stringify(payload));
  out.experiences = (out.experiences || []).filter((item) => String(item.companyName || '').trim());
  out.skills = (out.skills || []).filter((item) => String(item.skillName || '').trim());
  out.gaps = (out.gaps || []).filter((item) => String(item.description || '').trim());
  out.faq = (out.faq || []).filter(
    (item) => String(item.question || '').trim() || String(item.answer || '').trim()
  );
  out.certifications = (out.certifications || []).filter((item) => String(item.name || '').trim());
  out.aiInstructions.rules = (out.aiInstructions.rules || []).filter((item) =>
    String(item.instruction || '').trim()
  );
  out.education = (out.education || []).map((item) => ({
    ...item,
    school: item.institution || '',
  }));
  out.faq = (out.faq || []).map((item) => ({
    ...item,
    q: item.question || '',
    a: item.answer || '',
  }));
  return out;
}

/**
 * Parse an input into a number or return null for empty/unparseable values.
 *
 * @param {*} value
 * @returns {number|null}
 */
export function parseNullableNumber(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Validate salary min/max in the admin payload and throw on invalid range.
 *
 * @param {Object} payload
 */
export function validateSalaryRange(payload) {
  const min = parseNullableNumber(payload?.profile?.salaryMin);
  const max = parseNullableNumber(payload?.profile?.salaryMax);
  if (min !== null && max !== null && min > max) {
    throw new Error('Salary min cannot be greater than salary max');
  }
}

/**
 * Return a new default experience object for the UI.
 *
 * @returns {Object}
 */
export function defaultExperience() {
  return {
    companyName: '',
    title: '',
    titleProgression: '',
    startDate: '',
    endDate: '',
    current: false,
    achievementBullets: [],
    whyJoined: '',
    whyLeft: '',
    actualContributions: '',
    proudestAchievement: '',
    wouldDoDifferently: '',
    hardOrFrustrating: '',
    lessonsLearned: '',
    managerDescribe: '',
    reportsDescribe: '',
    conflictsChallenges: '',
    quantifiedImpact: '',
    displayOrder: 0,
  };
}

/**
 * Return a new default skill object for the UI.
 *
 * @returns {Object}
 */
export function defaultSkill() {
  return {
    skillName: '',
    category: 'strong',
    selfRating: 3,
    evidence: '',
    honestNotes: '',
    yearsExperience: '',
    lastUsed: '',
  };
}

/**
 * Return a new default education object for the UI.
 *
 * @returns {Object}
 */
export function defaultEducation() {
  return {
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    current: false,
    grade: '',
    notes: '',
    displayOrder: 0,
  };
}

/**
 * Return a new default certification object for the UI.
 *
 * @returns {Object}
 */
export function defaultCertification() {
  return {
    name: '',
    issuer: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
    verificationUrl: '',
    notes: '',
    displayOrder: 0,
  };
}

/**
 * Return a new default gap object for the UI.
 *
 * @returns {Object}
 */
export function defaultGap() {
  return {
    gapType: 'skill',
    description: '',
    whyItsAGap: '',
    interestedInLearning: true,
  };
}

/**
 * Return a new default FAQ object for the UI.
 *
 * @returns {Object}
 */
export function defaultFaq() {
  return { question: '', answer: '', isCommonQuestion: false };
}

/**
 * Return a new AI instruction rule default, using `existingRules` to set priority.
 *
 * @param {number} existingRules
 * @returns {Object}
 */
export function defaultRule(existingRules = 0) {
  return { instructionType: 'tone', instruction: '', priority: (existingRules + 1) * 10 };
}
