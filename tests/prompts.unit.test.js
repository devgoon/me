const { buildFitPrompt, buildChatPrompt } = require('../api/prompts');

describe('prompt builders - unit tests', () => {
  test('buildFitPrompt includes deduped equivalents (up to limit) and excludes base name from equivalents', () => {
    const payload = {
      profile: { name: 'Alice', email: 'a@x', title: 'Engineer', elevator_pitch: '' },
      experiences: [],
      skills: [
        {
          skill_name: 'React',
          equivalents: ['React', 'React.js', 'ReactJS', 'react.js', 'Other'],
          honest_notes: 'Used daily',
          years_experience: 3,
          last_used: null,
          category: 'strong'
        }
      ],
      aiInstructions: [],
      gaps: [],
      values: null,
      faq: [],
      education: []
    };

    const out = buildFitPrompt(payload);
    expect(out).toMatch(/\(equivalents: [^)]+\)/);
    // The base skill name should not appear as a standalone entry inside the equivalents list
    expect(out).not.toMatch(/\(equivalents:\s*React(\s|,|\))/);
  });

  test('buildChatPrompt includes equivalents as provided (chat lists them intact)', () => {
    const payload = {
      profile: { name: 'Bob', email: 'b@x', title: 'Dev', elevator_pitch: '' },
      experiences: [],
      skills: [
        {
          skill_name: 'Node',
          equivalents: ['Node', 'Node.js'],
          honest_notes: 'Backend work',
          category: 'strong'
        }
      ],
      aiInstructions: [],
      gaps: [],
      values: null,
      faq: [],
      education: []
    };

    const out = buildChatPrompt(payload);
    // chatSkillLines doesn't remove identical names from equivalents
    expect(out).toMatch(/\(equivalents: Node, Node\.js\)/);
  });

  test('buildFitPrompt falls back to prompt-without-equivalents when prompt is too long', () => {
    const longPitch = 'x'.repeat(9000);
    const payload = {
      profile: { name: 'Long', email: 'l@x', title: 'X', elevator_pitch: longPitch },
      experiences: [],
      skills: [
        {
          skill_name: 'Python',
          equivalents: ['Py', 'Python3'],
          honest_notes: 'Scripting',
          category: 'strong'
        }
      ],
      aiInstructions: [],
      gaps: [],
      values: null,
      faq: [],
      education: []
    };

    const out = buildFitPrompt(payload);
    // When too long the prompt builder removes equivalents to shrink size
    expect(out).not.toMatch(/equivalents:/);
    // But the profile name should still be present
    expect(out).toMatch(/Candidate: Long/);
  });

  test('buildFitPrompt includes certifications when provided', () => {
    const payload = {
      profile: { name: 'CertUser', email: 'c@x', title: 'Engineer', elevator_pitch: '' },
      experiences: [],
      skills: [],
      aiInstructions: [],
      gaps: [],
      values: null,
      faq: [],
      education: [],
      certifications: [
        { name: 'Certified Kubernetes Administrator', issuer: 'CNCF', issue_date: '2020-05-01' }
      ]
    };
    const out = buildFitPrompt(payload);
    expect(out).toMatch(/## CERTIFICATIONS/);
    expect(out).toMatch(/Certified Kubernetes Administrator/);
    expect(out).toMatch(/CNCF/);
  });

  test('buildChatPrompt includes certifications when provided', () => {
    const payload = {
      profile: { name: 'ChatCert', email: 'cc@x', title: 'Dev', elevator_pitch: '' },
      experiences: [],
      skills: [],
      aiInstructions: [],
      gaps: [],
      values: null,
      faq: [],
      education: [],
      certifications: [
        { name: 'AWS Certified Solutions Architect', issuer: 'AWS', issue_date: '2021-01-15' }
      ]
    };
    const out = buildChatPrompt(payload);
    expect(out).toMatch(/## CERTIFICATIONS/);
    expect(out).toMatch(/AWS Certified Solutions Architect/);
    expect(out).toMatch(/AWS/);
  });
});
