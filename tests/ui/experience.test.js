/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  localStorage.clear();
  // stub globals used by other frontend scripts
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
});

test('fetches and renders experiences into #experience-list', async () => {
  document.body.innerHTML = `
    <div id="experience-loading"></div>
    <div id="experience-list"></div>
  `;

  // mock fetch to return a small experience payload
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        experiences: [
          {
            id: 1,
            companyName: 'Acme Co',
            title: 'Developer',
            startDate: '2020-01-01',
            endDate: '2021-01-01',
            isCurrent: false,
            bulletPoints: ['Built X'],
          },
        ],
      }),
  });

  require('../../frontend/assets/js/experience.js');
  // trigger DOMContentLoaded handlers
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // allow microtasks to complete
  await new Promise((r) => setTimeout(r, 0));

  const list = document.getElementById('experience-list');
  expect(list).not.toBeNull();
  expect(list.querySelectorAll('.resume-item').length).toBe(1);
  expect(list.textContent).toMatch(/Acme Co/);
  expect(list.textContent).toMatch(/Built X/);
});

test('sorts current experiences first then by startDate (newest first)', async () => {
  document.body.innerHTML = `
    <div id="experience-loading"></div>
    <div id="experience-list"></div>
  `;

  // two experiences: older current and newer non-current -> current should appear first
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        experiences: [
          {
            id: 1,
            companyName: 'OldCurrentCo',
            title: 'Lead',
            startDate: '2018-01-01',
            endDate: null,
            isCurrent: true,
            bulletPoints: ['Led stuff'],
          },
          {
            id: 2,
            companyName: 'NewPastCo',
            title: 'Engineer',
            startDate: '2022-01-01',
            endDate: '2023-01-01',
            isCurrent: false,
            bulletPoints: ['Built new things'],
          },
        ],
      }),
  });

  require('../../frontend/assets/js/experience.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise((r) => setTimeout(r, 0));

  const items = document.querySelectorAll('#experience-list .resume-item');
  expect(items.length).toBe(2);
  // first item should be the current one
  expect(items[0].classList.contains('resume-item--current')).toBe(true);
  expect(items[0].textContent).toMatch(/OldCurrentCo/);
  // second item should be the newer past role
  expect(items[1].textContent).toMatch(/NewPastCo/);

  delete global.fetch;
});

// Chat-forwarding test removed because the chat toggle was intentionally removed
// in favor of a plain loading placeholder. If chat-forwarding is reintroduced,
// add tests to assert the forwarding behavior here.
