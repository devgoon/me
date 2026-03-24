/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

test('profile panel renders and saves profile changes', async () => {
  baseDom();
  const sample = { profile: { fullName: 'Lodovico', email: 'dev@lodovi.co', currentTitle: 'SWE' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  const title = document.getElementById('profile-currentTitle');
  expect(title.value).toBe('SWE');
  title.value = 'Principal Engineer';
  title.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  // give time for POST
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  expect(calls.length).toBeGreaterThanOrEqual(1);
  const last = calls[calls.length - 1];
  const opts = last[1];
  const payload = JSON.parse(opts.body);
  expect(payload.profile.currentTitle).toBe('Principal Engineer');
  fetchMock.mockRestore();
});
