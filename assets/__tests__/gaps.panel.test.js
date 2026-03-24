/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

test('gaps panel binds checkboxes and saves interest flags', async () => {
  baseDom();
  const sample = { gaps: [{ description: 'Rust', interestedInLearning: false }], profile: { email: 'dev@lodovi.co' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  const desc = document.querySelector('[data-gap="0"][data-field="description"]');
  const chk = document.querySelector('[data-gap="0"][data-field="interestedInLearning"]');
  expect(desc.value).toBe('Rust');
  // flip interest
  chk.checked = true; chk.dispatchEvent(new Event('change', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.gaps[0].interestedInLearning).toBe(true);
  fetchMock.mockRestore();
});
