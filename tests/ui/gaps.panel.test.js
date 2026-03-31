/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('gaps panel removes gap and saves empty array', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, gaps: [{ description: 'gap1' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const remove = document.querySelector('[data-remove-gap]');
  expect(remove).toBeTruthy();
  remove.click();
  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.gaps.length).toBe(0);
  fetchMock.mockRestore();
});
