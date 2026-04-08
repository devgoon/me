/**
 * @jest-environment jsdom
 */

beforeEach(() => {
  document.body.innerHTML = '';
  jest.resetModules();
  // ensure localStorage is clean
  localStorage.clear();
  // Stub third-party globals used by main.js
  global.GLightbox = jest.fn();
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn(), on: jest.fn() }));
  global.Swiper = jest.fn().mockImplementation(() => ({}));
  global.Typed = jest.fn();
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  global.PureCounter = jest.fn();
  global.Waypoint = jest.fn().mockImplementation(() => ({}));
});

test('removes #preloader on window load', () => {
  document.body.innerHTML = `<div id="preloader">loading</div>`;
  require('../../frontend/assets/js/main.js');
  // dispatch load
  window.dispatchEvent(new Event('load'));
  expect(document.getElementById('preloader')).toBeNull();
});

test('chat open/close toggles body class and aria-hidden', () => {
  document.body.innerHTML = `
    <button id="ask-ai-toggle"></button>
    <div id="ai-chat-panel" aria-hidden="true"></div>
    <div id="ai-chat-overlay" aria-hidden="true"></div>
    <button id="ai-chat-close"></button>
  `;
  require('../../frontend/assets/js/main.js');
  const toggle = document.getElementById('ask-ai-toggle');
  const panel = document.getElementById('ai-chat-panel');
  const overlay = document.getElementById('ai-chat-overlay');
  // open
  toggle.click();
  expect(document.body.classList.contains('ai-chat-open')).toBe(true);
  expect(panel.getAttribute('aria-hidden')).toBe('false');
  expect(overlay.getAttribute('aria-hidden')).toBe('false');
  // close via overlay
  overlay.click();
  expect(document.body.classList.contains('ai-chat-open')).toBe(false);
  expect(panel.getAttribute('aria-hidden')).toBe('true');
  expect(overlay.getAttribute('aria-hidden')).toBe('true');
});

test('mode toggle applies ai/traditional classes and persists to localStorage', () => {
  document.body.innerHTML = `
    <button id="mode-toggle-traditional">T</button>
    <button id="mode-toggle-ai">AI</button>
    <div id="ai-experimental-modal" style="display:none;" aria-hidden="true">
      <button id="ai-experimental-back">Go back to Classic view</button>
      <button id="ai-experimental-confirm">Proceed</button>
    </div>
  `;
  require('../../frontend/assets/js/main.js');
  const aiBtn = document.getElementById('mode-toggle-ai');
  const tradBtn = document.getElementById('mode-toggle-traditional');
  // click AI -> modal appears, then confirm
  aiBtn.click();
  const modal = document.getElementById('ai-experimental-modal');
  expect(modal.getAttribute('aria-hidden')).toBe('false');
  // confirm the modal
  const confirm = document.getElementById('ai-experimental-confirm');
  confirm.click();
  expect(document.body.dataset.siteMode).toBe('ai');
  expect(aiBtn.getAttribute('aria-pressed')).toBe('true');
  expect(tradBtn.getAttribute('aria-pressed')).toBe('false');
  expect(localStorage.getItem('site_mode')).toBe('ai');
  // click traditional
  tradBtn.click();
  expect(document.body.dataset.siteMode).toBe('traditional');
  expect(tradBtn.getAttribute('aria-pressed')).toBe('true');
  expect(aiBtn.getAttribute('aria-pressed')).toBe('false');
  expect(localStorage.getItem('site_mode')).toBe('traditional');
});

test('modal Back button returns to Classic mode without confirming', () => {
  document.body.innerHTML = `
    <button id="mode-toggle-traditional">T</button>
    <button id="mode-toggle-ai">AI</button>
    <div id="ai-experimental-modal" style="display:none;" aria-hidden="true">
      <button id="ai-experimental-back">Go back to Classic view</button>
      <button id="ai-experimental-confirm">Proceed</button>
    </div>
  `;
  require('../../frontend/assets/js/main.js');
  const aiBtn = document.getElementById('mode-toggle-ai');
  const back = document.getElementById('ai-experimental-back');
  // open modal
  aiBtn.click();
  const modal = document.getElementById('ai-experimental-modal');
  expect(modal.getAttribute('aria-hidden')).toBe('false');
  // click Back
  back.click();
  expect(document.body.dataset.siteMode).toBe('traditional');
  expect(modal.getAttribute('aria-hidden')).toBe('true');
});

test('confirm button is auto-focused when modal opens', () => {
  jest.useFakeTimers();
  document.body.innerHTML = `
    <button id="mode-toggle-ai">AI</button>
    <div id="ai-experimental-modal" style="display:none;" aria-hidden="true">
      <button id="ai-experimental-back">Go back to Classic view</button>
      <button id="ai-experimental-confirm">Proceed</button>
    </div>
  `;
  // attach a spy to focus
  const dom = document.createElement('div');
  document.body.appendChild(dom);
  require('../../frontend/assets/js/main.js');
  const confirm = document.getElementById('ai-experimental-confirm');
  confirm.focus = jest.fn();
  const aiBtn = document.getElementById('mode-toggle-ai');
  aiBtn.click();
  // advance timers for the setTimeout used to focus the button
  jest.runAllTimers();
  expect(confirm.focus).toHaveBeenCalled();
  jest.useRealTimers();
});

test('sendPrompt shows timeout message when fetch aborts', async () => {
  document.body.innerHTML = `
    <div id="ai-chat-history"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
  `;
  // mock fetch to reject with AbortError
  global.fetch = jest.fn().mockRejectedValue({ name: 'AbortError' });
  require('../../frontend/assets/js/main.js');

  const input = document.getElementById('ai-chat-input');
  const send = document.getElementById('ai-chat-send');
  const history = document.getElementById('ai-chat-history');
  // Ensure DOMContentLoaded handlers are bound
  document.dispatchEvent(new Event('DOMContentLoaded'));
  input.value = 'Hello';
  // click to send
  send.click();
  // allow async handlers to run
  await new Promise((r) => setTimeout(r, 0));
  expect(history.textContent).toMatch(/timed out/i);
  delete global.fetch;
});

// Dynamic company-loading unit tests removed; companies are static in HTML now

test('certification images are halved when loaded/complete', async () => {
  document.body.innerHTML = `<div id="certifications"><img id="cert1" /></div>`;
  const img = document.getElementById('cert1');
  // simulate an already-complete image with width
  Object.defineProperty(img, 'complete', { value: true, configurable: true });
  img.width = 240;
  require('../../frontend/assets/js/main.js');
  // dispatch DOMContentLoaded to trigger the handler
  document.dispatchEvent(new Event('DOMContentLoaded'));
  // allow handler to run
  await new Promise((r) => setTimeout(r, 0));
  // width should be reduced from the original value (halved at least once)
  expect(img.width).toBeLessThan(240);
  expect(img.width).toBeGreaterThan(0);
});

test('initializes Typed and PureCounter when elements present', () => {
  document.body.innerHTML = `<span class="typed" data-typed-items="one,two"></span>`;
  require('../../frontend/assets/js/main.js');
  expect(global.Typed).toHaveBeenCalled();
  expect(global.PureCounter).toHaveBeenCalled();
});

test('navbarlinksActive adds active class based on scroll position', () => {
  document.body.innerHTML = `
    <nav id="navbar"><a class="scrollto" href="#sec1">S</a></nav>
    <section id="sec1"></section>
  `;
  const link = document.querySelector('#navbar .scrollto');
  const section = document.getElementById('sec1');
  // choose offsets so position (scrollY + 200) falls inside [offsetTop, offsetTop+offsetHeight]
  Object.defineProperty(section, 'offsetTop', { value: 250, configurable: true });
  Object.defineProperty(section, 'offsetHeight', { value: 100, configurable: true });
  // set scroll so scrollY + 200 is inside 250..350
  Object.defineProperty(window, 'scrollY', { value: 120, writable: true });
  require('../../frontend/assets/js/main.js');
  // trigger load handler that runs navbarlinksActive
  window.dispatchEvent(new Event('load'));
  expect(link.classList.contains('active')).toBe(true);
});

test('back-to-top toggles active on scroll', () => {
  document.body.innerHTML = `<div class="back-to-top"></div>`;
  const btn = document.querySelector('.back-to-top');
  require('../../frontend/assets/js/main.js');
  // simulate scroll > 100
  Object.defineProperty(window, 'scrollY', { value: 150, writable: true });
  document.dispatchEvent(new Event('scroll'));
  // handler attached via onscroll should toggle class
  expect(btn.classList.contains('active')).toBe(true);
  // simulate scroll <= 100
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
  document.dispatchEvent(new Event('scroll'));
  expect(btn.classList.contains('active')).toBe(false);
});

test('mobile nav toggle toggles body class and icons', () => {
  document.body.innerHTML = `<button class="mobile-nav-toggle bi-list"></button>`;
  const btn = document.querySelector('.mobile-nav-toggle');
  require('../../frontend/assets/js/main.js');
  btn.click();
  expect(document.body.classList.contains('mobile-nav-active')).toBe(true);
  // classes on button should have toggled
  expect(btn.classList.contains('bi-list')).toBe(false);
});

test('scrollto click calls scrollTo and closes mobile nav when active', () => {
  document.body.innerHTML = `
    <button class="mobile-nav-toggle bi-list"></button>
    <a class="scrollto" href="#foo">Go</a>
    <div id="foo"></div>
  `;
  document.body.classList.add('mobile-nav-active');
  const target = document.getElementById('foo');
  Object.defineProperty(target, 'offsetTop', { value: 10, configurable: true });
  window.scrollTo = jest.fn();
  require('../../frontend/assets/js/main.js');
  const link = document.querySelector('.scrollto');
  link.click();
  expect(window.scrollTo).toHaveBeenCalled();
  // mobile nav should be closed
  expect(document.body.classList.contains('mobile-nav-active')).toBe(false);
});

test('portfolio filter click arranges isotope and marks active filter', () => {
  document.body.innerHTML = `
    <div class="portfolio-container"></div>
    <ul id="portfolio-filters"><li data-filter=".one">One</li><li data-filter=".two">Two</li></ul>
  `;
  // Ensure Isotope returns an instance we can inspect
  global.Isotope = jest.fn().mockImplementation(() => ({ arrange: jest.fn(), on: jest.fn() }));
  require('../../frontend/assets/js/main.js');
  // trigger load handlers
  window.dispatchEvent(new Event('load'));
  const filters = document.querySelectorAll('#portfolio-filters li');
  filters[1].click();
  // first and second: only second should be active
  expect(filters[1].classList.contains('filter-active')).toBe(true);
  // inspect Isotope instance arrange call
  const instance = global.Isotope.mock.results[0].value;
  expect(instance.arrange).toHaveBeenCalledWith({ filter: '.two' });
});

test('sendPrompt success appends assistant response and manages typing indicator', async () => {
  document.body.innerHTML = `
    <div id="ai-chat-history"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
  `;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ response: 'Hello from AI' }) });
  require('../../frontend/assets/js/main.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const input = document.getElementById('ai-chat-input');
  const send = document.getElementById('ai-chat-send');
  const history = document.getElementById('ai-chat-history');
  input.value = 'Query';
  send.click();
  // allow async handlers to run
  await new Promise((r) => setTimeout(r, 0));
  expect(history.textContent).toMatch(/Hello from AI/);
  delete global.fetch;
});

test('assistant responses render basic markdown (bold)', async () => {
  document.body.innerHTML = `
    <div id="ai-chat-history"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
  `;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ response: '**bold**' }) });
  require('../../frontend/assets/js/main.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const input = document.getElementById('ai-chat-input');
  const send = document.getElementById('ai-chat-send');
  const history = document.getElementById('ai-chat-history');
  input.value = 'Query';
  send.click();
  await new Promise((r) => setTimeout(r, 0));
  // assistant response should render <strong>bold</strong>
  expect(history.innerHTML).toMatch(/<strong>\s*bold\s*<\/strong>/i);
  delete global.fetch;
});

test('sendPrompt API non-ok response shows error details in assistant message', async () => {
  document.body.innerHTML = `
    <div id="ai-chat-history"></div>
    <input id="ai-chat-input" />
    <button id="ai-chat-send"></button>
  `;
  global.fetch = jest
    .fn()
    .mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'server oops' }) });
  require('../../frontend/assets/js/main.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const input = document.getElementById('ai-chat-input');
  const send = document.getElementById('ai-chat-send');
  const history = document.getElementById('ai-chat-history');
  input.value = 'Query';
  send.click();
  await new Promise((r) => setTimeout(r, 0));
  expect(history.textContent).toMatch(/AI request failed \(500\)/);
  delete global.fetch;
});

test('Waypoint handler and Isotope arrangeComplete refresh AOS and set progress widths', async () => {
  document.body.innerHTML = `
    <div class="skills-content"></div>
    <div class="progress"><div class="progress-bar" aria-valuenow="60"></div></div>
    <div class="portfolio-container"></div>
    <ul id="portfolio-filters"><li data-filter=".one">One</li></ul>
  `;
  // Make Waypoint call its handler immediately
  global.Waypoint = jest.fn().mockImplementation((opts) => {
    if (opts && typeof opts.handler === 'function') opts.handler('down');
    return {};
  });
  // Make Isotope call arrangeComplete when arrange is invoked
  global.Isotope = jest.fn().mockImplementation(() => {
    const inst = {
      arrange: function (_opts) {
        // noop: arrange will not immediately trigger callback here
      },
      on: function (ev, cb) {
        if (ev === 'arrangeComplete' && typeof cb === 'function') {
          // simulate arrange completion by invoking callback
          cb();
        }
      },
    };
    return inst;
  });
  // AOS shim
  global.AOS = { init: jest.fn(), refresh: jest.fn() };
  require('../../frontend/assets/js/main.js');
  // trigger load handlers
  window.dispatchEvent(new Event('load'));
  // waypoint handler should set progress width
  const pb = document.querySelector('.progress-bar');
  expect(pb.style.width).toBe('60%');
  // arrange should trigger AOS.refresh via arrangeComplete
  const instance = global.Isotope.mock.results[0].value;
  // invoke arrange by simulating a click on filter
  const filter = document.querySelector('#portfolio-filters li');
  filter.click();
  expect(global.AOS.refresh).toHaveBeenCalled();
});
