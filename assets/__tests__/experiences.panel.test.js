/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

test('experiences panel renders and persists edits', async () => {
  baseDom();
  const sample = { experiences: [{ companyName: 'Acme', title: 'Engineer', startDate: '2020-01-01' }] , profile: { email: 'dev@lodovi.co' }};
  const fetchMock = mockFetchForPanel(sample);

  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  const titleInput = document.querySelector('[data-exp="0"][data-field="title"]');
  expect(titleInput).toBeTruthy();
  expect(titleInput.value).toBe('Engineer');
  titleInput.value = 'Senior Engineer';
  titleInput.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.experiences[0].title).toBe('Senior Engineer');
  fetchMock.mockRestore();
});
