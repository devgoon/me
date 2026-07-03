// Mock the parse helpers used by prompts.js so tests are deterministic
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

const {
  buildFitPrompt,
  buildChatPrompt,
  buildExperienceSystemPrompt,
  buildExperienceUserPrompt,
} = require('../../api/prompts');

describe('prompts utilities', () => {
  test('ensureArray and listLines behaviors via prompt builders', () => {
    const payload = {
      profile: {
        name: 'Test User',
        email: 't@example.com',
        title: 'Developer',
        elevator_pitch: 'I build things',
        target_titles: ['Engineer'],
      },
      experiences: [],
      skills: [
        {
          category: 'strong',
          skill_name: 'Node',
          honest_notes: '',
          equivalents: ['node.js', 'NODE'],
        },
        { category: 'moderate', skill_name: 'React', honest_notes: 'usable', equivalents: [] },
        { category: 'gap', skill_name: 'OCaml', honest_notes: null, equivalents: [] },
      ],
      gaps: [],
      values: { must_haves: 'team,impact', dealbreakers: '' },
      faq: [],
      education: [],
      certifications: [],
      aiInstructions: [],
    };

    const fit = buildFitPrompt(payload);
    expect(fit).toMatch(/Candidate: Test User/);
    expect(fit).toMatch(/## SKILLS/);
    // equivalents appear for Node (unique filtering)
    expect(fit).toMatch(/equivalents/);

    const chat = buildChatPrompt(payload);
    expect(chat).toMatch(/You are an AI assistant representing Test User/);
    expect(chat).toMatch(/## SKILLS SELF-ASSESSMENT/);
  });

  test('experience bullet points and values handling', () => {
    const payload = {
      profile: { name: 'P', email: 'e', title: 'T', elevator_pitch: '', target_titles: [] },
      experiences: [
        {
          company_name: 'C',
          start_date: '2020',
          end_date: null,
          title: 'Dev',
          bullet_points: 'one\ntwo',
          why_joined: '',
          why_left: '',
          actual_contributions: '',
          proudest_achievement: '',
        },
      ],
      skills: [],
      gaps: [],
      values: { must_haves: 'x,y' },
      faq: [],
      education: [],
      certifications: [],
      aiInstructions: [],
    };
    const fit = buildFitPrompt(payload);
    // bullet points should be expanded into list lines
    expect(fit).toMatch(/- one\n- two/);
    // must_haves should appear in values text
    expect(fit).toMatch(/must_haves/);
  });

  test('buildExperience prompts format', () => {
    const sys = buildExperienceSystemPrompt({ name: 'X' });
    expect(sys).toMatch(/You generate concise role context for X/);
    const user = buildExperienceUserPrompt({ experiences: [{ id: 1 }] });
    expect(user).toMatch(/"experiences":/);
  });

  test('buildChatPrompt includes GitHub portfolio when provided', () => {
    const payload = {
      profile: { name: 'Dev', email: 'e', title: 'T', elevator_pitch: '', target_titles: [] },
      experiences: [],
      skills: [],
      gaps: [],
      values: null,
      faq: [],
      education: [],
      certifications: [],
      aiInstructions: [],
      gitHub: {
        hook: 'An interactive portfolio site',
        features: '- Feature 1\n- Feature 2',
        techStack: '- Node.js\n- React',
        url: 'https://github.com/devgoon/me',
      },
    };

    const chat = buildChatPrompt(payload);
    expect(chat).toMatch(/PUBLIC PORTFOLIO/);
    expect(chat).toMatch(/github\.com\/devgoon\/me/);
    expect(chat).toMatch(/An interactive portfolio site/);
    expect(chat).toMatch(/Feature 1/);
    expect(chat).toMatch(/Node\.js/);
  });

  test('buildChatPrompt omits GitHub section when not provided', () => {
    const payload = {
      profile: { name: 'Dev', email: 'e', title: 'T', elevator_pitch: '', target_titles: [] },
      experiences: [],
      skills: [],
      gaps: [],
      values: null,
      faq: [],
      education: [],
      certifications: [],
      aiInstructions: [],
      gitHub: { hook: '', features: '', techStack: '', url: '' },
    };

    const chat = buildChatPrompt(payload);
    expect(chat).not.toMatch(/PUBLIC PORTFOLIO/);
  });

  test('buildFitPrompt includes GitHub portfolio when provided', () => {
    const payload = {
      profile: { name: 'Dev', email: 'e', title: 'T', elevator_pitch: '', target_titles: [] },
      experiences: [],
      skills: [],
      gaps: [],
      values: null,
      faq: [],
      education: [],
      certifications: [],
      aiInstructions: [],
      gitHub: {
        hook: 'An interactive site',
        features: '- Feature 1',
        techStack: '- Node.js',
        url: 'https://github.com/devgoon/me',
      },
    };

    const fit = buildFitPrompt(payload);
    expect(fit).toMatch(/PUBLIC PORTFOLIO/);
    expect(fit).toMatch(/github\.com\/devgoon\/me/);
    expect(fit).toMatch(/An interactive site/);
  });

  test('buildFitPrompt omits GitHub section when URL is empty', () => {
    const payload = {
      profile: { name: 'Dev', email: 'e', title: 'T', elevator_pitch: '', target_titles: [] },
      experiences: [],
      skills: [],
      gaps: [],
      values: null,
      faq: [],
      education: [],
      certifications: [],
      aiInstructions: [],
      gitHub: { hook: 'test', features: '', techStack: '', url: '' },
    };

    const fit = buildFitPrompt(payload);
    expect(fit).not.toMatch(/PUBLIC PORTFOLIO/);
  });
});
