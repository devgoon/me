import { ADMIN_DEFAULT_FAQ, ADMIN_INITIAL_STATE } from './state.js';

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

export function parseNullableNumber(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateSalaryRange(payload) {
  const min = parseNullableNumber(payload?.profile?.salaryMin);
  const max = parseNullableNumber(payload?.profile?.salaryMax);
  if (min !== null && max !== null && min > max) {
    throw new Error('Salary min cannot be greater than salary max');
  }
}

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

export function defaultGap() {
  return {
    gapType: 'skill',
    description: '',
    whyItsAGap: '',
    interestedInLearning: true,
  };
}

export function defaultFaq() {
  return { question: '', answer: '', isCommonQuestion: false };
}

export function defaultRule(existingRules = 0) {
  return { instructionType: 'tone', instruction: '', priority: (existingRules + 1) * 10 };
}
