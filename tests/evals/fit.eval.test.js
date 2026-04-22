const fs = require('fs');
const path = require('path');
const { evaluateFitResponse } = require('./fit-rubric');

function loadCases() {
  const fixturePath = path.join(__dirname, 'fixtures', 'fit-eval-cases.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

describe('fit prompt evaluation rubric', () => {
  const cases = loadCases();

  test('fixture cases are defined', () => {
    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThanOrEqual(3);
  });

  test.each(cases)('case %s should pass rubric minimums', (testCase) => {
    const result = evaluateFitResponse(testCase, testCase.modelResponse);

    expect(result.score).toBeGreaterThanOrEqual(result.minScore);
    expect(result.failures).toEqual([]);
    expect(result.passed).toBe(true);
  });

  test('rubric catches weak response', () => {
    const weakCase = cases[2];
    const weakResponse = {
      score: 92,
      verdict: 'FIT',
      reasons: ['Great candidate'],
      mismatches: [],
      suggestedMessage: 'Perfect fit',
    };

    const result = evaluateFitResponse(weakCase, weakResponse);

    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  test('rubric catches sensitive data leakage in fit response', () => {
    const caseWithDefaultPrivacy = cases[0];
    const piiResponse = {
      score: 82,
      verdict: 'FIT',
      reasons: ['Strong backend alignment'],
      mismatches: [],
      suggestedMessage:
        'I am interested. Contact me at 555-123-4567 or visit me at 42 Elm Street to discuss.',
    };

    const result = evaluateFitResponse(caseWithDefaultPrivacy, piiResponse);

    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes('contains sensitive data patterns'))).toBe(true);
  });
});
