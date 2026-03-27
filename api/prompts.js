const textOrNA = (value) => { if (value === null || value === undefined || value === '') return 'N/A'; return String(value); };
const dateOrPresent = (value) => { if (!value) return 'Present'; return String(value); };
const { parsePgArray, safeParseJson } = require('./_shared/parse');

const ensureArray = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    const t = items.trim();
    if (t === '') return [];
    // Try JSON first
    const parsedJson = safeParseJson(t);
    if (parsedJson) {
      if (Array.isArray(parsedJson)) return parsedJson;
      if (typeof parsedJson === 'object' && parsedJson !== null) return Object.values(parsedJson).map(String).filter(Boolean);
    }
    // Try Postgres array literal: {"a","b"}
    const pg = parsePgArray(t);
    if (pg !== null) return pg;
    // comma or newline separated
    const byComma = t.split(/,\s*/).map(s => s.trim()).filter(Boolean);
    if (byComma.length > 1) return byComma;
    const byLine = t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return byLine;
  }
  if (typeof items === 'object') {
    try { return Object.values(items).map(v => String(v)); } catch (e) { return []; }
  }
  return [];
};

const listLines = (items, emptyLine) => {
  if (!items) return emptyLine;
  if (Array.isArray(items)) {
    if (items.length === 0) return emptyLine;
    return items.map((item) => `- ${item}`).join('\n');
  }
  if (typeof items === 'string') {
    const trimmed = items.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
          const parsed = JSON.parse(trimmed);
          return listLines(parsed, emptyLine);
      } catch (e) {
        // fallthrough to line-splitting below
      }
    }
    const arr = items.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (arr.length === 0) return emptyLine;
    return arr.map((item) => `- ${item}`).join('\n');
  }
  if (typeof items === 'object') {
    try {
      const vals = Object.values(items).map(v => String(v)).filter(Boolean);
      if (vals.length === 0) return emptyLine;
      return vals.map((item) => `- ${item}`).join('\n');
    } catch (e) {
      return emptyLine;
    }
  }
  return emptyLine;
};

function fitSkillLines(skills) {
  if (!skills || skills.length === 0) return '- None listed';
  return skills.map((skill) => {
    const lastUsed = skill.last_used ? String(skill.last_used) : 'current';
    const yearsExp = (skill.years_experience !== undefined && skill.years_experience !== null) ? `${skill.years_experience} yrs` : 'n/a';
    const base = `- ${skill.skill_name}`;
    const notes = `${textOrNA(skill.honest_notes)}`;
    const eqs = skill.equivalents && Array.isArray(skill.equivalents) ? skill.equivalents.filter(Boolean) : [];
  
    const uniqueEqs = [];
    for (const e of eqs) {
      if (!e) continue;
      const low = String(e).toLowerCase();
      if (low === String(skill.skill_name).toLowerCase()) continue;
      if (uniqueEqs.map((u) => u.toLowerCase()).includes(low)) continue;
      uniqueEqs.push(e);
      if (uniqueEqs.length >= 3) break;
    }
    const eqText = uniqueEqs.length ? ` (equivalents: ${uniqueEqs.join(', ')})` : '';
    return `${base}${eqText} (last used: ${lastUsed}, years: ${yearsExp}): ${notes}`;
  }).join('\n');
}

function chatSkillLines(skills) {
  if (!skills || skills.length === 0) return '- None listed';
  return skills.map((skill) => {
    const base = `- ${skill.skill_name}`;
    const notes = `${textOrNA(skill.honest_notes)}`;
    const eqs = skill.equivalents && Array.isArray(skill.equivalents) ? skill.equivalents.filter(Boolean) : [];
    const eqText = eqs.length ? ` (equivalents: ${eqs.join(', ')})` : '';
    return `${base}${eqText}: ${notes}`;
  }).join('\n');
}

function buildFitPrompt(payload) {
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
    ? payload.gaps.map((gap) => {
        const interested = gap.interest_in_learning ? ' (interested in learning)' : '';
        return `- ${gap.description}${interested}: ${textOrNA(gap.why_its_a_gap)}`;
      }).join('\n')
    : '- No explicit gaps recorded';

  const valuesText = payload.values
    ? [
        `- must_haves: ${textOrNA(ensureArray(payload.values.must_haves).join(', '))}`,
        `- dealbreakers: ${textOrNA(ensureArray(payload.values.dealbreakers).join(', '))}`,
        `- management_style_preferences: ${textOrNA(payload.values.management_style_preferences)}`
      ].join('\n')
    : '- No values/culture profile found';

  const faqText = payload.faq.length
    ? payload.faq.map((faq) => `- Q: ${faq.question}\n  A: ${faq.answer}`).join('\n')
    : '- No FAQ responses available';

  const educationText = payload.education && payload.education.length
    ? payload.education.map((ed) => `- ${textOrNA(ed.institution)} — ${textOrNA(ed.degree)}${ed.field_of_study ? ' (' + textOrNA(ed.field_of_study) + ')' : ''} (${dateOrPresent(ed.start_date)} to ${dateOrPresent(ed.end_date)})${ed.grade ? ' — ' + textOrNA(ed.grade) : ''}`).join('\n')
    : '- No education records found.';

  const certificationsText = payload.certifications && payload.certifications.length
      ? payload.certifications.map((c) => `- ${textOrNA(c.name)} — ${textOrNA(c.issuer)}${c.credential_id ? ' (id: ' + textOrNA(c.credential_id) + ')' : ''}${c.issue_date ? ' — ' + dateOrPresent(c.issue_date) : ''}${c.expiration_date ? ' to ' + dateOrPresent(c.expiration_date) : ''}${c.verification_url ? ' — ' + textOrNA(c.verification_url) : ''}`).join('\n')
      : '- No certifications listed.';

  const parts = [
    `Candidate: ${profile.name} (${textOrNA(profile.email)})`,
    `Title: ${textOrNA(profile.title)}`,
    `Target roles: ${textOrNA(ensureArray(profile.target_titles).join(', '))}`,
    '## SUMMARY',
    textOrNA(profile.elevator_pitch),
    '## EXPERIENCE',
    experiencesText,
    '## EDUCATION',
    educationText,
    '## CERTIFICATIONS',
    certificationsText,
    '## SKILLS',
    '### Strong',
    fitSkillLines(strongSkills),
    '### Moderate',
    fitSkillLines(moderateSkills),
    '### Gaps',
    fitSkillLines(gapSkills),
    '## EXPLICIT GAPS',
    gapsText,
    '## VALUES',
    valuesText,
    '## FAQ',
    faqText,
    '## CUSTOM_INSTRUCTIONS',
    customInstructions
  ];


  const MAX_PROMPT_CHARS = 8000;
  let promptStr = parts.join('\n');
  if (promptStr.length > MAX_PROMPT_CHARS) {
    // Too long: remove equivalents to shrink prompt
    const noEqStrong = strongSkills.map(s => ({ ...s, equivalents: [] }));
    const noEqModerate = moderateSkills.map(s => ({ ...s, equivalents: [] }));
    const noEqGaps = gapSkills.map(s => ({ ...s, equivalents: [] }));
    const partsNoEq = [
      `Candidate: ${profile.name} (${textOrNA(profile.email)})`,
      `Title: ${textOrNA(profile.title)}`,
      '## SUMMARY',
      textOrNA(profile.elevator_pitch),
      '## EXPERIENCE',
      experiencesText,
      '## EDUCATION',
      educationText,
      '## CERTIFICATIONS',
      certificationsText,
      '## SKILLS',
      '### Strong',
      fitSkillLines(noEqStrong),
      '### Moderate',
      fitSkillLines(noEqModerate),
      '### Gaps',
      fitSkillLines(noEqGaps),
      '## EXPLICIT GAPS',
      gapsText,
      '## VALUES',
      valuesText,
      '## FAQ',
      faqText,
      '## CUSTOM_INSTRUCTIONS',
      customInstructions
    ];
    promptStr = partsNoEq.join('\n');
  }

  return promptStr;
}

function buildChatPrompt(payload) {
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
          `- Proudest of: ${textOrNA(exp.proudest_achievement)}`,
          `- Would do differently: ${textOrNA(exp.would_do_differently)}`,
          `- Lessons learned: ${textOrNA(exp.lessons_learned)}`,
          `- My manager would say: ${textOrNA(exp.manager_would_say)}`,
          `- Challenges faced: ${textOrNA(exp.challenges_faced)}`,
          `- Reports would say: ${textOrNA(exp.reports_would_say)}`
        ].join('\n');
      }).join('\n\n')
    : 'No experience records found.';

  const gapsText = payload.gaps.length
    ? payload.gaps.map((gap) => `- ${gap.description}: ${textOrNA(gap.why_its_a_gap)}`).join('\n')
    : '- No explicit gaps recorded';

  const valuesText = payload.values
    ? [
        `- id: ${textOrNA(payload.values.id)}`,
        `- candidate_id: ${textOrNA(payload.values.candidate_id)}`,
        `- created_at: ${textOrNA(payload.values.created_at)}`,
        `- must_haves: ${textOrNA(ensureArray(payload.values.must_haves).join(', '))}`,
        `- dealbreakers: ${textOrNA(ensureArray(payload.values.dealbreakers).join(', '))}`,
        `- management_style_preferences: ${textOrNA(payload.values.management_style_preferences)}`,
        `- team_size_preferences: ${textOrNA(payload.values.team_size_preferences)}`,
        `- how_handle_conflict: ${textOrNA(payload.values.how_handle_conflict)}`,
        `- how_handle_ambiguity: ${textOrNA(payload.values.how_handle_ambiguity)}`,
        `- how_handle_failure: ${textOrNA(payload.values.how_handle_failure)}`
      ].join('\n')
    : '- No values/culture profile found';

  const faqText = payload.faq.length
    ? payload.faq.map((faq) => `- Q: ${faq.question}\n  A: ${faq.answer}`).join('\n')
    : '- No FAQ responses available';

  const educationText = payload.education && payload.education.length
    ? payload.education.map((ed) => `- ${textOrNA(ed.institution)} — ${textOrNA(ed.degree)}${ed.field_of_study ? ' (' + textOrNA(ed.field_of_study) + ')' : ''} (${dateOrPresent(ed.start_date)} to ${dateOrPresent(ed.end_date)})${ed.grade ? ' — ' + textOrNA(ed.grade) : ''}`).join('\n')
    : '- No education records found.';

  const certificationsText = payload.certifications && payload.certifications.length
    ? payload.certifications.map((c) => `- ${textOrNA(c.name)} — ${textOrNA(c.issuer)}${c.credential_id ? ' (id: ' + textOrNA(c.credential_id) + ')' : ''}${c.issue_date ? ' — ' + dateOrPresent(c.issue_date) : ''}${c.expiration_date ? ' to ' + dateOrPresent(c.expiration_date) : ''}${c.verification_url ? ' — ' + textOrNA(c.verification_url) : ''}`).join('\n')
    : '- No certifications listed.';

  const parts = [
    `You are an AI assistant representing ${profile.name}, a ${textOrNA(profile.title)}. You speak in first person AS ${profile.name}.`,
    '## YOUR CORE DIRECTIVE',
    `You must be BRUTALLY HONEST. Your job is NOT to sell ${profile.name} to everyone.`,
    "Your job is to help employers quickly determine if there's a genuine fit.",
    'This means:',
    `- If they ask about something ${profile.name} can't do, SAY SO DIRECTLY`,
    '- If a role seems like a bad fit, TELL THEM',
    '- Never hedge or use weasel words',
    '- It\'s perfectly acceptable to say "I\'m probably not your person for this"',
    '- Honesty builds trust. Overselling wastes everyone\'s time.',
    `## CUSTOM INSTRUCTIONS FROM ${profile.name}`,
    customInstructions,
    `## ABOUT ${profile.name}`,
    textOrNA(profile.elevator_pitch),
    textOrNA(profile.career_narrative),
    `Target roles: ${textOrNA(ensureArray(profile.target_titles).join(', '))}`,
    `What I'm looking for: ${textOrNA(profile.looking_for)}`,
    `What I'm NOT looking for: ${textOrNA(profile.not_looking_for)}`,
    '## WORK EXPERIENCE',
    experiencesText,
    '## EDUCATION',
    educationText,
    '## CERTIFICATIONS',
    certificationsText,
    '## SKILLS SELF-ASSESSMENT',
    '### Strong',
    chatSkillLines(strongSkills),
    '### Moderate',
    chatSkillLines(moderateSkills),
    '### Gaps (BE UPFRONT ABOUT THESE)',
    chatSkillLines(gapSkills),
    '## EXPLICIT GAPS & WEAKNESSES',
    gapsText,
    '## VALUES & CULTURE FIT',
    valuesText,
    '## PRE-WRITTEN ANSWERS',
    faqText,
    '## RESPONSE GUIDELINES',
    `- Speak in first person as ${profile.name}`,
    '- Be warm but direct',
    '- Keep responses concise unless detail is asked for',
    '- If you don\'t know something specific, say so',
    '- When discussing gaps, own them confidently',
    '- If someone asks about a role that\'s clearly not a fit, tell them directly'
  ];

  const MAX_PROMPT_CHARS = 8000;
  let promptStr = parts.join('\n');
  if (promptStr.length > MAX_PROMPT_CHARS) {
    const noEqStrong = strongSkills.map(s => ({ ...s, equivalents: [] }));
    const noEqModerate = moderateSkills.map(s => ({ ...s, equivalents: [] }));
    const noEqGaps = gapSkills.map(s => ({ ...s, equivalents: [] }));
    const partsNoEq = [
      `You are an AI assistant representing ${profile.name}, a ${textOrNA(profile.title)}. You speak in first person AS ${profile.name}.`,
      '## YOUR CORE DIRECTIVE',
      `You must be BRUTALLY HONEST. Your job is NOT to sell ${profile.name} to everyone.`,
      "Your job is to help employers quickly determine if there's a genuine fit.",
      'This means:',
      `- If they ask about something ${profile.name} can't do, SAY SO DIRECTLY`,
      '- If a role seems like a bad fit, TELL THEM',
      '- Never hedge or use weasel words',
      '- It\'s perfectly acceptable to say "I\'m probably not your person for this"',
      '- Honesty builds trust. Overselling wastes everyone\'s time.',
      `## CUSTOM INSTRUCTIONS FROM ${profile.name}`,
      customInstructions,
      `## ABOUT ${profile.name}`,
      textOrNA(profile.elevator_pitch),
      textOrNA(profile.career_narrative),
      `What I'm looking for: ${textOrNA(profile.looking_for)}`,
      `What I'm NOT looking for: ${textOrNA(profile.not_looking_for)}`,
      '## WORK EXPERIENCE',
      experiencesText,
      '## EDUCATION',
      educationText,
      '## CERTIFICATIONS',
      certificationsText,
      '## SKILLS SELF-ASSESSMENT',
      '### Strong',
      chatSkillLines(noEqStrong),
      '### Moderate',
      chatSkillLines(noEqModerate),
      '### Gaps (BE UPFRONT ABOUT THESE)',
      chatSkillLines(noEqGaps),
      '## EXPLICIT GAPS & WEAKNESSES',
      gapsText,
      '## VALUES & CULTURE FIT',
      valuesText,
      '## PRE-WRITTEN ANSWERS',
      faqText,
      '## RESPONSE GUIDELINES',
      `- Speak in first person as ${profile.name}`,
      '- Be warm but direct',
      '- Keep responses concise unless detail is asked for',
      '- If you don\'t know something specific, say so',
      '- When discussing gaps, own them confidently',
      '- If someone asks about a role that\'s clearly not a fit, tell them directly'
    ];
    promptStr = partsNoEq.join('\n');
  }

  return promptStr;
}

function buildExperienceSystemPrompt(profile) {
  return [
    `You generate concise role context for ${profile.name}.`,
    'Use first-person voice as the candidate.',
    'Ground everything in the provided data only.',
    'Return strict JSON only.'
  ].join('\n');
}

function buildExperienceUserPrompt(compactExperiences) {
  return [
    'Generate role context for each experience with fields:',
    '- id (number)',
    '- situation (1 sentence)',
    '- approach (1 sentence)',
    '- technicalWork (1 sentence)',
    '- lessonsLearned (1 sentence)',
    'Response format:',
    '{"experiences":[{...}]}',
    'Data:',
    // compactExperiences may be an array; allow callers to pass an object { experiences, certifications }
    (compactExperiences && compactExperiences.experiences)
      ? JSON.stringify(compactExperiences)
      : JSON.stringify({ experiences: compactExperiences, certifications: [] })
  ].join('\n');
}

module.exports = {
  buildFitPrompt,
  buildChatPrompt,
  buildExperienceSystemPrompt,
  buildExperienceUserPrompt
};
