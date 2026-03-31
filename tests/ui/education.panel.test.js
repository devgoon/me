/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../../assets/test/helpers');

test('education panel renders and saves entries', async () => {
  baseDom();
  const sample = { education: [{ institution: 'Uni', degree: 'MS', fieldOfStudy: 'CS' }], profile: { email: 'dev@lodovi.co' }};
  const fetchMock = mockFetchForPanel(sample);

  require('../../assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const inst = document.querySelector('[data-edu="0"][data-field="institution"]');
  expect(inst).toBeTruthy();
  expect(inst.value).toBe('Uni');
  inst.value = 'State Univ'; inst.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.education[0].institution).toBe('State Univ');
  fetchMock.mockRestore();
});
