/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
});

test('experience-ai.js renders experiences and skills from API', async () => {
  // Setup DOM elements that the script expects
  document.body.innerHTML = `
    <section id="experience-list"></section>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;

  const mockResponse = {
    experiences: [
      {
        id: 10,
        companyName: 'Acme',
        title: 'Developer',
        startDate: '2020-01-01',
        endDate: null,
        isCurrent: true,
        bulletPoints: ['Built X', 'Improved Y'],
        aiContext: {
          situation: 'S',
          approach: 'A',
          technicalWork: 'T',
          lessonsLearned: 'L',
        },
      },
    ],
    skills: { strong: ['Node.js'], moderate: ['Docker'], gap: ['Cobol'] },
  };

  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });

  // Require the script which will run and call loadData()
  require('../../frontend/assets/js/experience-ai.js');

  // Wait for async actions in loadData
  await new Promise((r) => setTimeout(r, 0));

  const expList = document.getElementById('experience-list');
  const skillsList = document.getElementById('skills-list');
  expect(expList).toBeTruthy();
  expect(skillsList).toBeTruthy();
  // Experience should contain company name and AI context toggle
  expect(expList.innerHTML).toMatch(/Acme/);
  expect(expList.innerHTML).toMatch(/Show AI Context/);
  // Skills should contain Node.js and Docker
  expect(skillsList.innerHTML).toMatch(/Node.js/);
  expect(skillsList.innerHTML).toMatch(/Docker/);

  delete global.fetch;
});

test('renderExperience handles various bulletPoints formats and invalid dates', async () => {
  document.body.innerHTML = `
    <section id="experience-list"></section>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;
  const mockResponse = {
    experiences: [
      // JSON string bullets
      {
        id: 1,
        companyName: 'JSONCorp',
        title: 'Engineer',
        startDate: 'not-a-date',
        endDate: null,
        isCurrent: true,
        bulletPoints: JSON.stringify(['J1', 'J2']),
        aiContext: { situation: '', approach: '', technicalWork: '', lessonsLearned: '' },
      },
      // comma separated bullets
      {
        id: 2,
        companyName: 'CommaInc',
        title: 'Dev',
        startDate: '2019-01-01',
        endDate: '2020-01-01',
        isCurrent: false,
        bulletPoints: 'C1, C2',
        aiContext: { situation: '', approach: '', technicalWork: '', lessonsLearned: '' },
      },
      // empty bullets -> no-achievements
      {
        id: 3,
        companyName: 'EmptyLLC',
        title: 'X',
        startDate: '2018-01-01',
        endDate: '2018-12-31',
        isCurrent: false,
        bulletPoints: '',
        aiContext: { situation: '', approach: '', technicalWork: '', lessonsLearned: '' },
      },
    ],
    skills: { strong: [], moderate: [], gap: [] },
  };

  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });
  require('../../frontend/assets/js/experience-ai.js');
  await new Promise((r) => setTimeout(r, 0));

  const expHtml = document.getElementById('experience-list').innerHTML;
  // JSON bullets should render as list items
  expect(expHtml).toMatch(/J1/);
  // comma bullets should render
  expect(expHtml).toMatch(/C1/);
  // empty bullets should show no-achievements message
  expect(expHtml).toMatch(/No public achievements provided/);
  // invalid date should surface the raw 'not-a-date' string
  expect(expHtml).toMatch(/not-a-date/);

  delete global.fetch;
});

test('renderSkills partitions interested and notInterested gaps correctly', async () => {
  document.body.innerHTML = `
    <section id="experience-list"></section>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;
  const mockResponse = {
    experiences: [],
    skills: {
      strong: ['S1'],
      moderate: ['M1'],
      gap: [
        { description: 'G-interested', interested: true, whyItsAGap: 'a' },
        { description: 'G-not', interested: false, whyItsAGap: 'b' },
        'PlainGap',
      ],
    },
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });
  require('../../frontend/assets/js/experience-ai.js');
  await new Promise((r) => setTimeout(r, 0));
  const skillsHtml = document.getElementById('skills-list').innerHTML;
  // Strong and moderate present
  expect(skillsHtml).toMatch(/S1/);
  expect(skillsHtml).toMatch(/M1/);
  // Interested should include G-interested
  expect(skillsHtml).toMatch(/G-interested/);
  // Not interested should include G-not and PlainGap
  expect(skillsHtml).toMatch(/G-not/);
  expect(skillsHtml).toMatch(/PlainGap/);

  delete global.fetch;
});

test('ai-context-toggle click toggles panel visibility and button text', async () => {
  document.body.innerHTML = `
    <section id="experience-list"></section>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;
  const mockResponse = {
    experiences: [
      {
        id: 11,
        companyName: 'ToggleCo',
        title: 'Toggle',
        startDate: '2020-01-01',
        endDate: null,
        isCurrent: true,
        bulletPoints: ['B1'],
        aiContext: { situation: 'S', approach: 'A', technicalWork: 'T', lessonsLearned: 'L' },
      },
    ],
    skills: { strong: [], moderate: [], gap: [] },
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });
  require('../../frontend/assets/js/experience-ai.js');
  await new Promise((r) => setTimeout(r, 0));

  const button = document.querySelector('.ai-context-toggle');
  const panelId = button.getAttribute('data-target');
  const panel = document.getElementById(panelId);
  // initial state
  expect(button.getAttribute('aria-expanded')).toBe('false');
  // toggle open
  let docClicked = false;
  document.addEventListener('click', () => {
    docClicked = true;
  });
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(docClicked).toBe(true);
  expect(panel.hidden).toBe(false);
  expect(button.textContent).toMatch(/Hide AI Context/);

  // clicking again hides
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(panel.hidden).toBe(true);
  expect(button.textContent).toMatch(/Show AI Context/);

  delete global.fetch;
});

test('loadData failure shows error and clears lists', async () => {
  document.body.innerHTML = `
    <section id="experience-list"></section>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;
  // simulate network failure
  global.fetch = jest.fn().mockRejectedValue(new Error('network'));
  require('../../frontend/assets/js/experience-ai.js');
  await new Promise((r) => setTimeout(r, 0));
  const err = document.getElementById('experience-error');
  expect(err.hidden).toBe(false);
  expect(err.textContent).toMatch(/The API is a bit cold/);
  expect(document.getElementById('experience-list').innerHTML).toBe('');
  expect(document.getElementById('skills-list').innerHTML).toBe('');
  delete global.fetch;
});

test('does not render inline star and uses class for current roles', async () => {
  document.body.innerHTML = `
    <section id="experience-list"></section>
    <div id="skills-list"></div>
    <div id="experience-error" hidden></div>
  `;
  const mockResponse = {
    experiences: [
      {
        id: 99,
        companyName: 'StarlessCo',
        title: 'NoStar',
        startDate: '2021-01-01',
        endDate: null,
        isCurrent: true,
        bulletPoints: ['X'],
        aiContext: { situation: '', approach: '', technicalWork: '', lessonsLearned: '' },
      },
    ],
    skills: { strong: [], moderate: [], gap: [] },
  };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });
  require('../../frontend/assets/js/experience-ai.js');
  await new Promise((r) => setTimeout(r, 0));

  const expList = document.getElementById('experience-list');
  // there should be no inline .current-star element
  expect(expList.querySelector('.current-star')).toBeNull();
  // article should have the resume-item--current class so CSS ::after will render the pill
  const article = expList.querySelector('.role-card');
  expect(article).toBeTruthy();
  expect(article.classList.contains('resume-item--current')).toBe(true);

  delete global.fetch;
});
