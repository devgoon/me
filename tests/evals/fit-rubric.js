/**
 * Fit rubric scoring model (0-100):
 * - Valid output contract: score/verdict/reasons/mismatches/suggestedMessage
 * - Verdict-score consistency (FIT, MARGINAL, NO FIT ranges)
 * - Required term coverage from case expectations
 * - Allowed verdict constraints per case
 * - Optional mismatch presence requirements
 * - Forbidden term checks
 *
 * A case passes only when:
 * - score >= expectations.minScore (default 70)
 * - and there are no failures recorded.
 */
const ALLOWED_VERDICTS = new Set(['FIT', 'MARGINAL', 'NO FIT']);

function detectSensitiveData(text) {
  const hits = [];
  const patterns = [
    { label: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
    { label: 'email', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
    { label: 'phone', regex: /\b(?:\+1\s*)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/g },
    {
      label: 'address',
      regex:
        /\b\d{1,6}\s+[A-Za-z0-9.'\-\s]{2,}\s(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Way|Pl|Place)\b/gi,
    },
    { label: 'secret_key', regex: /\bsk-[A-Za-z0-9\-_]{12,}\b/g },
    {
      label: 'auth_token',
      regex: /\b(?:bearer\s+[A-Za-z0-9\-._~+/]+=*|api[_-]?key\s*[:=]\s*\S+)\b/gi,
    },
    {
      label: 'connection_string',
      regex: /\b(?:Data Source|Server)=.+;\s*(?:Initial Catalog|Database)=.+;.+\b/gi,
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      hits.push(pattern.label);
    }
  }

  return [...new Set(hits)];
}

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function includesAllTerms(text, terms) {
  const normalized = normalizeText(text);
  return terms.filter((term) => normalized.includes(normalizeText(term)));
}

function scoreVerdictVsScore(verdict, score) {
  if (typeof score !== 'number') return 0;
  if (verdict === 'FIT' && score >= 70) return 15;
  if (verdict === 'MARGINAL' && score >= 40 && score <= 79) return 15;
  if (verdict === 'NO FIT' && score <= 50) return 15;
  return 5;
}

function evaluateFitResponse(testCase, response) {
  const failures = [];
  let points = 0;
  const maxPoints = 100;

  if (!response || typeof response !== 'object') {
    return {
      id: testCase.id,
      passed: false,
      score: 0,
      maxScore: maxPoints,
      failures: ['Response is not an object'],
    };
  }

  if (typeof response.score === 'number' && response.score >= 0 && response.score <= 100) {
    points += 15;
  } else {
    failures.push('score must be a number in range 0-100');
  }

  if (typeof response.verdict === 'string' && ALLOWED_VERDICTS.has(response.verdict)) {
    points += 15;
  } else {
    failures.push('verdict must be one of FIT, MARGINAL, NO FIT');
  }

  if (Array.isArray(response.reasons) && response.reasons.length > 0) {
    points += 10;
  } else {
    failures.push('reasons must be a non-empty array');
  }

  if (Array.isArray(response.mismatches)) {
    points += 10;
  } else {
    failures.push('mismatches must be an array');
  }

  if (
    typeof response.suggestedMessage === 'string' &&
    response.suggestedMessage.trim().length > 20
  ) {
    points += 10;
  } else {
    failures.push('suggestedMessage must be a non-trivial string');
  }

  points += scoreVerdictVsScore(response.verdict, response.score);

  const expectations = testCase.expectations || {};
  const responseOnlyText = [
    ...(Array.isArray(response.reasons) ? response.reasons : []),
    ...(Array.isArray(response.mismatches) ? response.mismatches : []),
    response.suggestedMessage || '',
  ].join(' ');
  const combinedText = [
    ...(Array.isArray(response.reasons) ? response.reasons : []),
    ...(Array.isArray(response.mismatches) ? response.mismatches : []),
    response.suggestedMessage || '',
    testCase.jobDescription || '',
  ].join(' ');

  const mustMention = Array.isArray(expectations.mustMention) ? expectations.mustMention : [];
  const foundTerms = includesAllTerms(combinedText, mustMention);
  const mentionCoverage = mustMention.length === 0 ? 1 : foundTerms.length / mustMention.length;
  points += Math.round(15 * mentionCoverage);
  if (mentionCoverage < 1) {
    const missing = mustMention.filter((term) => !foundTerms.includes(term));
    failures.push(`missing required terms: ${missing.join(', ')}`);
  }

  if (Array.isArray(expectations.allowedVerdicts) && expectations.allowedVerdicts.length > 0) {
    if (expectations.allowedVerdicts.includes(response.verdict)) {
      points += 5;
    } else {
      failures.push(`verdict ${response.verdict} not allowed for this case`);
    }
  } else {
    points += 5;
  }

  if (expectations.mustContainMismatches === true) {
    if (Array.isArray(response.mismatches) && response.mismatches.length > 0) {
      points += 5;
    } else {
      failures.push('expected non-empty mismatches');
    }
  } else {
    points += 5;
  }

  const forbiddenTerms = Array.isArray(expectations.forbiddenTerms)
    ? expectations.forbiddenTerms
    : [];
  const forbiddenHits = forbiddenTerms.filter((term) =>
    normalizeText(combinedText).includes(normalizeText(term))
  );
  if (forbiddenHits.length === 0) {
    points += 10;
  } else {
    failures.push(`contains forbidden terms: ${forbiddenHits.join(', ')}`);
  }

  if (expectations.allowSensitiveData !== true) {
    const sensitiveHits = detectSensitiveData(responseOnlyText);
    if (sensitiveHits.length > 0) {
      failures.push(`contains sensitive data patterns: ${sensitiveHits.join(', ')}`);
    }
  }

  const boundedPoints = Math.min(maxPoints, points);
  const minScore = typeof expectations.minScore === 'number' ? expectations.minScore : 70;
  const passed = boundedPoints >= minScore && failures.length === 0;

  return {
    id: testCase.id,
    passed,
    score: boundedPoints,
    maxScore: maxPoints,
    minScore,
    failures,
  };
}

module.exports = {
  evaluateFitResponse,
};
