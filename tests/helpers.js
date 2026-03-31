/** Test helper utilities for client-side panel tests (moved under tests/) */
// Provide a safe fetch implementation so tests can spy on it
if (typeof global.fetch === 'undefined') {
  // assign a jest function placeholder so spyOn works
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
}

function baseDom() {
  document.body.innerHTML = `
    <div id="admin-message"></div>
    <button id="save-all">Save All</button>
    <input id="profile-fullName" />
    <input id="profile-email" />
    <input id="profile-currentTitle" />
    <input id="profile-salaryMin" />
    <input id="profile-salaryMax" />
    <input id="profile-availableStarting" />
    <input id="profile-linkedInUrl" />
    <input id="all-bio" />
    <div id="experience-list"></div>
    <div id="skills-list"></div>
    <div id="education-list"></div>
    <div id="gaps-list"></div>
    <div id="faq-list"></div>
    <div id="ai-rule-list"></div>
    <input data-ai-rules-toggle id="ai-rules-toggle" type="checkbox" />
    <button id="add-faq">Add FAQ</button>
    <button id="add-education">Add Education</button>
    <button id="add-ai-rule">Add AI Rule</button>
    <input id="target-title-input" />
    <button id="add-target-title"></button>
    <button id="add-skill"></button>
    <button id="add-experience"></button>
  `;
}

function mockFetchForPanel(sampleData) {
  const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url, opts) => {
    if (String(url).endsWith('/api/auth/me')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { email: 'dev@lodovi.co' } }) });
    }
    if (String(url).endsWith('/api/panel-data') && (!opts || opts.method === 'GET')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(sampleData) });
    }
    if (String(url).endsWith('/api/panel-data') && opts && String(opts.method).toUpperCase() === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  return fetchMock;
}

async function waitForMessageContains(text, timeout = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.getElementById('admin-message');
    if (el && el.textContent && el.textContent.includes(text)) return;
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error('timeout waiting for message: ' + text);
}

module.exports = { baseDom, mockFetchForPanel, waitForMessageContains };
