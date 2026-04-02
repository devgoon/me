/**
 * @fileoverview Analyzer utilities used by the Fit UI and tests.
 * @module frontend/assets/js/fit-analyzer.js
 */

// Lightweight analyzer exported for use in tests and optional integration.
// Designed to be CommonJS-friendly so tests can require() it.
function escapeForRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function includesAny(text, terms) {
  if (!text) return false;
  return terms.some((term) => {
    const re = new RegExp(`\\b${escapeForRegex(term)}\\b`, "i");
    return re.test(text);
  });
}

function skillLinesFromEntries(skills, text) {
  if (!Array.isArray(skills)) return [];
  const lower = String(text || "").toLowerCase();
  function hasQualifierInSameSentence(text, key) {
    const qualifiers = ['must haves', 'must have','experience', 'proven', 'proven experience', 'required', 'preferred', 'familiarity', 'familiarity with', 'experience with', 'proven in', 'proven with'];
    // split into sentences (rough)
      const sentences = String(text || '').split(/[.\n?!]+/).map(s => s.trim()).filter(Boolean);
    const k = String(key || '').toLowerCase();
    for (const s of sentences) {
      const sl = s.toLowerCase();
      if (sl.includes(k)) {
        for (const q of qualifiers) {
          if (sl.includes(q)) return true;
        }
      }
    }
    return false;
  }

  return skills.filter((entry) => {
    const key = String(entry.key || '').toLowerCase();
    if (!key) return false;
    // If key is multi-word, match anywhere
    if (key.split(/\s+/).length > 1) {
      return lower.includes(key);
    }
    // For single-word tokens (languages), only match if a qualifier appears
    // in the same sentence of the job description.
    return hasQualifierInSameSentence(lower, key);
  }).map((e) => e.label || e.key);
}

function educationLinesFromEntries(education, text) {
  if (!Array.isArray(education)) return [];
  const lower = String(text || "").toLowerCase();
  const degreeTerms = ['bachelor', 'bs', 'ba', 'master', 'ms', "m.s", 'phd', 'doctorate', 'associate', 'mba'];
  return education.filter((e) => {
    const degree = String(e.degree || '').toLowerCase();
    const field = String(e.fieldOfStudy || e.field_of_study || '').toLowerCase();
    const inst = String(e.institution || '').toLowerCase();
    // If JD mentions degree level or field or institution, consider it a match
    if (degree && degreeTerms.some(d => lower.includes(d) && degree.includes(d))) return true;
    if (field && lower.includes(field)) return true;
    if (inst && lower.includes(inst)) return true;
    // Also if JD mentions the field (tokenized) and degree is non-empty
    if (field && field.split(/\W+/).some(tok => tok && lower.includes(tok))) return true;
    return false;
  }).map((e) => {
    const deg = e.degree || e.degree_name || '';
    const fld = e.fieldOfStudy || e.field_of_study || '';
    const inst = e.institution || '';
    const years = (e.startDate || e.start_date ? `${e.startDate || e.start_date || ''}` : '') + (e.endDate || e.end_date ? ` - ${e.endDate || e.end_date}` : '');
    const labelParts = [deg, fld, inst].filter(Boolean);
    return labelParts.join(', ') + (years ? ` (${years})` : '');
  });
}

function gapLinesFromEntries(gaps, text) {
  if (!Array.isArray(gaps)) return [];
  // Return objects: { text: string, interested: boolean }
  return gaps
    .filter((entry) => {
      const keys = Array.isArray(entry.keys) ? entry.keys : [];
      return keys.some((k) => {
        if (!k) return false;
        const kk = String(k).toLowerCase().trim();
        if (kk.length < 2) return false;
        const re = new RegExp("\\b" + escapeForRegex(kk) + "\\b", "i");
        return re.test(text);
      });
    })
    .map((entry) => ({ text: entry.text || entry.key || '', interested: Boolean(entry.interested) }));
}

function analyzeJD(jobDescription, profileStrengths = [], possibleGaps = [], education = []) {
  const jd = String(jobDescription || "").trim();
  const transfers = skillLinesFromEntries(profileStrengths, jd);
  const gapObjs = gapLinesFromEntries(possibleGaps, jd);
  const educationMatches = educationLinesFromEntries(education, jd);

  // educationMatches are a positive signal but usually weaker than direct skills
  // gaps penalize the score; gaps the candidate is "interested" in learning penalize less
  const gapPenalty = gapObjs.reduce((sum, g) => sum + (g.interested ? 1 : 2), 0);
  const score = (transfers.length * 2) + (educationMatches.length * 1) - gapPenalty;
  let verdict = 'Worth a Conversation';
  let verdictClass = 'mid';
  let opening = "I'd call this a mixed fit: I can likely deliver meaningful value here, but I would want to align expectations on the few areas that are less direct matches.";
  let recommendation = 'Proceed to a technical conversation focused on the highest-risk requirements, then decide quickly based on concrete gap tolerance.';
  // Count hard gaps (not marked as interested) for strict checks
  const hardGaps = gapObjs.filter(g => !g.interested).length;
  // If there is any hard gap (not interested in learning), do NOT recommend.
  if (hardGaps > 0) {
    verdict = 'Probably Not Your Person';
    verdictClass = 'weak';
    recommendation = 'I do not recommend pursuing this role unless these gaps are addressed.';
  } else if (score >= 5 && hardGaps <= 1) {
    verdict = 'Strong Fit';
    verdictClass = 'strong';
    opening = "I'm a strong fit for this role based on direct overlap in cloud architecture, API delivery, and production reliability outcomes.";
    recommendation = 'Move forward with a scoped technical interview centered on architecture depth and execution speed in your domain.';
  } else if (score <= 0 || hardGaps >= 3) {
    verdict = 'Probably Not Your Person';
    verdictClass = 'weak';
    opening = "I'm probably not your person for this specific role as written, and I'd rather be direct about that than force a weak match.";
    recommendation = 'If these requirements are truly fixed, I would pass; if they are flexible, reframe around platform/API ownership and we can reassess quickly.';
  }

  const result = {
    verdict,
    verdictClass,
    opening,
    recommendation,
    gaps: gapObjs.length > 0 ? gapObjs.map(g => g.interested ? `${g.text} (interested in learning)` : g.text) : ['No major red flags in the JD wording, but I would still validate role scope, seniority expectations, and team operating model in conversation.'],
    transfers: transfers.length > 0 ? transfers.concat(educationMatches) : (educationMatches.length > 0 ? educationMatches : ['My transferable strengths are broad cloud architecture, systems design, and shipping reliable software in high-stakes environments.']),
    educationMatches
  };

  return result;
}

// Export for CommonJS (node) if available, but avoid ReferenceError in browsers
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = { includesAny, analyzeJD, skillLinesFromEntries, gapLinesFromEntries, educationLinesFromEntries };
}

if (typeof window !== 'undefined') {
  window.fitAnalyzer = { includesAny, analyzeJD, skillLinesFromEntries, gapLinesFromEntries, educationLinesFromEntries };
}
