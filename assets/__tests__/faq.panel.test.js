/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

test('faq panel renders items and saves changes', async () => {
  baseDom();
  const sample = { faq: [{ question: 'Q1', answer: 'A1', isCommonQuestion: true }], profile: { email: 'dev@lodovi.co' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  const q = document.querySelector('[data-faq="0"][data-field="question"]');
  const a = document.querySelector('[data-faq="0"][data-field="answer"]');
  expect(q.value).toBe('Q1');
  a.value = 'Updated A1'; a.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.faq[0].answer).toBe('Updated A1');
  fetchMock.mockRestore();
});
