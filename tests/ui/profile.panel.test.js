/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('profile panel loads and updates profile fields', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: { fullName: 'Test User', email: 't@e.com' } };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const fullName = document.getElementById('profile-fullName');
  const email = document.getElementById('profile-email');
  expect(fullName.value).toBe('Test User');
  expect(email.value).toBe('t@e.com');

  fullName.value = 'Updated';
  fullName.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.profile.fullName).toBe('Updated');
  fetchMock.mockRestore();
});

test('profile panel renders and saves profile changes (title)', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: { fullName: 'Lodovico', email: 'dev@lodovi.co', currentTitle: 'SWE' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const title = document.getElementById('profile-currentTitle');
  expect(title.value).toBe('SWE');
  title.value = 'Principal Engineer';
  title.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  expect(calls.length).toBeGreaterThanOrEqual(1);
  const last = calls[calls.length - 1];
  const opts = last[1];
  const payload = JSON.parse(opts.body);
  expect(payload.profile.currentTitle).toBe('Principal Engineer');
  fetchMock.mockRestore();
});
