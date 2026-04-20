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

  global.fetch = jest.fn().mockImplementation((url) => {
    if (String(url) === '/_shared/default-data.json') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          skills: { strong: [{ label: 'FallbackNode' }], moderate: ['FallbackGo'] },
        }),
      });
    }
    throw new Error('Unexpected fetch url: ' + url);
  });

  // Provide apiFetch (used by the frontend) which resolves after a short delay
  global.apiFetch = window.apiFetch = jest.fn().mockImplementation(
    () =>
      new Promise((res) =>
        setTimeout(
          () =>
            res({
              ok: true,
              json: async () => ({ skills: { strong: ['Node.js', 'JS'], moderate: ['Go'] } }),
            }),
          50
        )
      )
  );

  // Require the script which attaches DOMContentLoaded listener
  require('../../frontend/assets/js/skills.js');

  // Simulate DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // Allow microtasks so defaults render immediately
  await new Promise((r) => setTimeout(r, 0));

  const cur = document.getElementById('skill-tags-current');
  const bro = document.getElementById('skill-tags-broader');
  expect(cur).toBeTruthy();
  expect(bro).toBeTruthy();
  // Defaults should be rendered first (before API resolves)
  expect(cur.textContent).toMatch(/FallbackNode/);
  expect(bro.textContent).toMatch(/FallbackGo/);

  // Wait for API override and verify API-rendered values appear
  await new Promise((r) => setTimeout(r, 80));
  expect(cur.textContent).toMatch(/Node.js/);
  expect(cur.textContent).toMatch(/JS/);
  expect(bro.textContent).toMatch(/Go/);

  delete global.fetch;
  delete global.apiFetch;
  delete window.apiFetch;
});

test('skills.js keeps JSON defaults and shows warning when API is unavailable', async () => {
  document.body.innerHTML = `
    <div class="skills">
      <h2 class="section-title">Skills</h2>
    </div>
    <div id="skill-tags-current"></div>
    <div id="skill-tags-broader"></div>
  `;

  global.fetch = jest.fn().mockImplementation((url) => {
    if (String(url) === '/_shared/default-data.json') {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          skills: { strong: [{ label: 'S1' }, { description: 'S2' }], moderate: ['M1'] },
        }),
      });
    }
    throw new Error('Unexpected fetch url: ' + url);
  });
  global.apiFetch = window.apiFetch = jest.fn().mockResolvedValue({ ok: false });

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
  delete global.apiFetch;
  delete window.apiFetch;
});
