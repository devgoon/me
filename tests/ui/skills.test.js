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
