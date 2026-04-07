/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  localStorage.clear();
  // stub third-party globals used by main.js
  global.GLightbox = jest.fn();
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn(), on: jest.fn() }));
  global.Swiper = jest.fn().mockImplementation(() => ({}));
  global.Typed = jest.fn();
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  global.PureCounter = jest.fn();
  global.Waypoint = jest.fn().mockImplementation(() => ({}));
});

test('loadCompanies populates hero-company-badges with unique companies preserving order', async () => {
  document.body.innerHTML = `<div class="hero-company-badges">Fallback</div>`;

  const mockResponse = {
    experiences: [
      { companyName: 'Acme' },
      { companyName: 'acme' },
      { companyName: 'Beta' },
      { companyName: 'Acme ' },
      { companyName: '' },
    ],
  };

  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });

  require('../../frontend/assets/js/main.js');
  // trigger loadCompanies which attaches on DOMContentLoaded
  document.dispatchEvent(new Event('DOMContentLoaded'));
  // allow async microtasks
  await new Promise((r) => setTimeout(r, 0));

  const container = document.querySelector('.hero-company-badges');
  expect(container).toBeTruthy();
  // Should have replaced fallback with spans
  const spans = Array.from(container.querySelectorAll('span')).map((s) => s.textContent.trim());
  expect(spans).toEqual(['Acme', 'Beta']);

  delete global.fetch;
});

test('loadCompanies restores original content when API returns empty list', async () => {
  const original = '<span>Static</span>';
  document.body.innerHTML = `<div class="hero-company-badges">${original}</div>`;
  const mockResponse = { experiences: [] };
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });
  require('../../frontend/assets/js/main.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await new Promise((r) => setTimeout(r, 0));

  const container = document.querySelector('.hero-company-badges');
  expect(container.innerHTML).toBe(original);
  delete global.fetch;
});
