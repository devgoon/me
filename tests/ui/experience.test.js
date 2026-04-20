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

  // mock fetch so defaults load from /_shared/default-data.json first,
  // then API data overrides after a short delay
  global.fetch = jest.fn().mockImplementation((url) => {
    if (String(url) === '/_shared/default-data.json') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            experiences: [
              {
                id: 'd0',
                companyName: 'DefaultCo',
                title: 'DefaultRole',
                startDate: '2019-01-01',
                endDate: '2019-12-31',
                isCurrent: false,
                bulletPoints: ['Default work'],
              },
            ],
          }),
      });
    }
    throw new Error('Unexpected fetch url: ' + url);
  });
  global.apiFetch = window.apiFetch = jest.fn().mockImplementation(
    () =>
      new Promise((res) =>
        setTimeout(
          () =>
            res({
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
            }),
          50
        )
      )
  );

  require('../../frontend/assets/js/experience.js');
  // trigger DOMContentLoaded handlers
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // allow microtasks so defaults render immediately
  await new Promise((r) => setTimeout(r, 0));

  const list = document.getElementById('experience-list');
  expect(list).not.toBeNull();
  // default entry should be present before API resolves
  expect(list.querySelectorAll('.resume-item').length).toBe(1);
  expect(list.textContent).toMatch(/DefaultCo/);
  expect(list.textContent).toMatch(/Default work/);

  // wait for API override
  await new Promise((r) => setTimeout(r, 80));
  expect(list.querySelectorAll('.resume-item').length).toBe(1);
  expect(list.textContent).toMatch(/Acme Co/);
  expect(list.textContent).toMatch(/Built X/);

  delete global.fetch;
  delete global.apiFetch;
  delete window.apiFetch;
});

test('loads defaults from canonical default-data.json experience object shape', async () => {
  document.body.innerHTML = `
    <div id="experience-loading"></div>
    <div id="experience-list"></div>
  `;

  global.fetch = jest.fn().mockImplementation((url) => {
    if (String(url) === '/_shared/default-data.json') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            experience: {
              experiences: [
                {
                  id: 'dcanon',
                  companyName: 'CanonicalCo',
                  title: 'CanonicalRole',
                  startDate: '2019-01-01',
                  endDate: '2019-12-31',
                  isCurrent: false,
                  bulletPoints: ['Canonical work'],
                },
              ],
            },
          }),
      });
    }
    throw new Error('Unexpected fetch url: ' + url);
  });
  global.apiFetch = window.apiFetch = jest.fn().mockRejectedValue(new Error('network-failure'));

  require('../../frontend/assets/js/experience.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise((r) => setTimeout(r, 50));

  const list = document.getElementById('experience-list');
  expect(list).not.toBeNull();
  expect(list.querySelectorAll('.resume-item').length).toBe(1);
  expect(list.textContent).toMatch(/CanonicalCo/);
  expect(list.textContent).toMatch(/Canonical work/);

  delete global.fetch;
  delete global.apiFetch;
  delete window.apiFetch;
});

test('sorts current experiences first then by startDate (newest first)', async () => {
  document.body.innerHTML = `
    <div id="experience-loading"></div>
    <div id="experience-list"></div>
  `;

  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ experiences: [] }),
  });
  global.apiFetch = window.apiFetch = jest.fn().mockResolvedValue({
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
  delete global.apiFetch;
  delete window.apiFetch;
});

test('keeps JSON defaults when API unavailable', async () => {
  document.body.innerHTML = `
    <div id="experience-loading"></div>
    <div id="experience-list"></div>
  `;

  global.fetch = jest.fn().mockImplementation((url) => {
    if (String(url) === '/_shared/default-data.json') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            experiences: [
              {
                id: 'd1',
                companyName: 'DefaultCo',
                title: 'DefaultDev',
                startDate: '2019-01-01',
                endDate: '2020-01-01',
                isCurrent: false,
                bulletPoints: ['Did default work'],
              },
            ],
          }),
      });
    }
    throw new Error('Unexpected fetch url: ' + url);
  });
  global.apiFetch = window.apiFetch = jest.fn().mockRejectedValue(new Error('network-failure'));

  require('../../frontend/assets/js/experience.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));

  // Allow the async rendering to occur
  await new Promise((r) => setTimeout(r, 50));

  const list = document.getElementById('experience-list');
  expect(list).not.toBeNull();
  expect(list.querySelectorAll('.resume-item').length).toBe(1);
  expect(list.textContent).toMatch(/DefaultCo/);
  expect(list.textContent).toMatch(/Did default work/);

  // Loading element should be hidden and display fallback message after API failure
  const loading = document.getElementById('experience-loading');
  expect(loading.style.display).toBe('none');
  expect(loading.textContent).toMatch(/Unable to load experience/);

  delete global.fetch;
  delete global.apiFetch;
  delete window.apiFetch;
});

// Chat-forwarding test removed because the chat toggle was intentionally removed
// in favor of a plain loading placeholder. If chat-forwarding is reintroduced,
// add tests to assert the forwarding behavior here.
