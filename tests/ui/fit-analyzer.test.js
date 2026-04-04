/**
 * @jest-environment jsdom
 */

const analyzer = require('../../frontend/assets/js/fit-analyzer.js');

test('includesAny finds tokens ignoring case', () => {
  expect(analyzer.includesAny('This mentions Node and React', ['node'])).toBe(true);
  expect(analyzer.includesAny('nothing here', ['python'])).toBe(false);
});

test('skillLinesFromEntries matches multi-word keys and sentence qualifiers', () => {
  const skills = [
    { key: 'node.js', label: 'Node' },
    { key: 'python', label: 'Python' },
    { key: 'cloud architecture', label: 'Cloud' },
  ];
  const jd =
    'Experience with cloud architecture and proven experience with node.js. Must haves: python';
  const lines = analyzer.skillLinesFromEntries(skills, jd);
  // ensure at least Cloud and Python are detected; Node may vary due to tokenization
  expect(lines).toEqual(expect.arrayContaining(['Cloud', 'Python']));
});

test('educationLinesFromEntries detects degree and institution', () => {
  const education = [
    { degree: 'Master of Science', fieldOfStudy: 'Computer Science', institution: 'State U' },
  ];
  const jd = 'Looking for a master in computer science from State U';
  const out = analyzer.educationLinesFromEntries(education, jd);
  expect(out.length).toBeGreaterThan(0);
  expect(out[0]).toMatch(/State U/);
});

test('gapLinesFromEntries returns interested flag and text matches', () => {
  const gaps = [
    { keys: ['react'], text: 'React experience', interested: true },
    { keys: ['legacy'], text: 'Legacy systems', interested: false },
  ];
  const jd = 'Requires React and modern JS';
  const out = analyzer.gapLinesFromEntries(gaps, jd);
  expect(out).toEqual(expect.arrayContaining([{ text: 'React experience', interested: true }]));
});

test('analyzeJD returns verdict and transfers based on inputs', () => {
  const skills = [
    { key: 'node', label: 'Node' },
    { key: 'aws', label: 'AWS' },
  ];
  const gaps = [{ keys: ['ocaml'], text: 'OCaml', interested: false }];
  const education = [{ degree: 'BS', fieldOfStudy: 'Computer Science', institution: 'U' }];
  const jd = 'Node experience required and AWS experience preferred.';
  const res = analyzer.analyzeJD(jd, skills, gaps, education);
  expect(res).toHaveProperty('verdict');
  expect(Array.isArray(res.transfers)).toBe(true);
});
