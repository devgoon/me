/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  localStorage.clear();
});

test('back-to-top hidden on /admin paths', () => {
  document.body.innerHTML = `<a class="back-to-top" href="#hero"></a>`;
  // stub GLightbox and other globals to avoid errors when requiring main.js
  global.GLightbox = jest.fn();
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn() }));
  global.Swiper = jest.fn();
  global.Typed = jest.fn();
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  global.PureCounter = jest.fn();
  global.Waypoint = jest.fn().mockImplementation(() => ({}));

  // set path using history.pushState to avoid jsdom navigation errors
  window.history.pushState({}, '', '/admin');

  require('../../frontend/assets/js/main.js');

  const bt = document.querySelector('.back-to-top');
  expect(bt.style.display).toBe('none');
});

test('back-to-top visible on normal pages and responds to scroll', () => {
  document.body.innerHTML = `<a class="back-to-top" href="#hero"></a>`;
  // stub GLightbox and other globals
  global.GLightbox = jest.fn();
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn() }));
  global.Swiper = jest.fn();
  global.Typed = jest.fn();
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  global.PureCounter = jest.fn();
  global.Waypoint = jest.fn().mockImplementation(() => ({}));

  // set non-admin path
  window.history.pushState({}, '', '/');

  // expose scrollY modifiable value
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

  require('../../frontend/assets/js/main.js');

  const bt = document.querySelector('.back-to-top');
  // initially not active
  expect(bt.classList.contains('active')).toBe(false);
  // simulate scroll past threshold
  Object.defineProperty(window, 'scrollY', { value: 200, writable: true, configurable: true });
  document.dispatchEvent(new Event('scroll'));
  expect(bt.classList.contains('active')).toBe(true);
});
