/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  // clean DOM
  document.body.innerHTML = '';
  jest.resetModules();
});

test('skills.js populates skill tag columns from API', async () => {
  // Prepare DOM elements expected by skills.js
  document.body.innerHTML = `
    <div id="skill-tags-current"></div>
    <div id="skill-tags-broader"></div>
  `;

  // Mock fetch to return a skills payload
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ skills: { strong: ['Node.js', 'JS'], moderate: ['Go'] } }),
  });

  // Require the script which attaches DOMContentLoaded listener
  require('../../frontend/assets/js/skills.js');

  // Simulate DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // Wait for async work
  await new Promise((r) => setTimeout(r, 0));

  const cur = document.getElementById('skill-tags-current');
  const bro = document.getElementById('skill-tags-broader');
  expect(cur).toBeTruthy();
  expect(bro).toBeTruthy();
  // Now the columns should contain rendered tags
  expect(cur.textContent).toMatch(/Node.js/);
  expect(cur.textContent).toMatch(/JS/);
  expect(bro.textContent).toMatch(/Go/);

  delete global.fetch;
});

test('skills.js falls back to window.SKILLS_DATA and shows warning', async () => {
  document.body.innerHTML = `
    <div class="skills">
      <h2 class="section-title">Skills</h2>
    </div>
    <div id="skill-tags-current"></div>
    <div id="skill-tags-broader"></div>
  `;

  // Mock fetch to fail
  global.fetch = jest.fn().mockResolvedValue({ ok: false });
  // Provide fallback data with object items
  window.SKILLS_DATA = { strong: [{ label: 'S1' }, { description: 'S2' }], moderate: ['M1'] };

  require('../../frontend/assets/js/skills.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  // wait for retries/backoff to complete in test environment
  await new Promise((r) => setTimeout(r, 200));

  const cur = document.getElementById('skill-tags-current');
  const bro = document.getElementById('skill-tags-broader');
  expect(cur.textContent).toMatch(/S1/);
  expect(cur.textContent).toMatch(/S2/);
  expect(bro.textContent).toMatch(/M1/);
  const note = document.querySelector('.skills-load-warning');
  expect(note).toBeTruthy();

  delete global.fetch;
  delete window.SKILLS_DATA;
});
