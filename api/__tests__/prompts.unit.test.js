const { buildFitPrompt, buildChatPrompt } = require('../prompts');

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
});
