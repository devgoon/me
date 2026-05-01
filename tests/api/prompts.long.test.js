// Target long-prompt branches and edge cases in api/prompts.js
// Reuse mocked parse helpers for deterministic behavior
vi.mock('../../api/_shared/parse', () => ({
  parsePgArray: (s) => {
    if (!s || typeof s !== 'string') return null;
    const t = s.trim();
    if (t.startsWith('{') && t.endsWith('}')) {
      return t
        .slice(1, -1)
        .split(',')
        .map((x) => x.replace(/"/g, '').trim())
        .filter(Boolean);
    }
    return null;
  },
  safeParseJson: (s) => {
    if (!s || typeof s !== 'string') return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  },
}));

const { buildFitPrompt, buildChatPrompt, buildExperienceUserPrompt } = require('../../api/prompts');

function makeLargePayload() {
  const profile = { name: 'Big', email: 'big@example.com', title: 'Dev', elevator_pitch: 'x' };
  // create many experiences with long bullet points to exceed MAX_PROMPT_CHARS
  const experiences = new Array(300).fill(0).map((_, i) => ({
    company_name: `C${i}`,
    start_date: '2010',
    end_date: '2020',
    title: 'Developer',
    bullet_points: new Array(50).fill(`achievement ${i}`).join('\n'),
    why_joined: 'reason',
    why_left: 'left',
    actual_contributions: 'did stuff',
    proudest_achievement: 'proud',
  }));
  const skills = [
    {
      category: 'strong',
      skill_name: 'Node',
      honest_notes: 'ok',
      equivalents: ['node.js', 'NODE'],
    },
    { category: 'moderate', skill_name: 'React', honest_notes: 'ok', equivalents: ['reactjs'] },
  ];
  return {
    profile,
    experiences,
    skills,
    gaps: [],
    values: { must_haves: '' },
    faq: [],
    education: [],
    certifications: [],
    aiInstructions: [],
  };
}

test('buildFitPrompt removes equivalents when prompt exceeds MAX_PROMPT_CHARS', () => {
  const payload = makeLargePayload();
  const prompt = buildFitPrompt(payload);
  // When truncated, equivalents should be removed from skill lines
  expect(prompt.length).toBeGreaterThan(0);
  expect(prompt).not.toMatch(/equivalents:/);
});

test('buildChatPrompt removes equivalents when prompt exceeds MAX_PROMPT_CHARS', () => {
  const payload = makeLargePayload();
  const prompt = buildChatPrompt(payload);
  expect(prompt.length).toBeGreaterThan(0);
  expect(prompt).not.toMatch(/equivalents:/);
});

test('buildExperienceUserPrompt accepts array input and wraps into experiences object', () => {
  const arr = [{ id: 1, company: 'X' }];
  const out = buildExperienceUserPrompt(arr);
  expect(out).toMatch(/\"experiences\":/);
});
