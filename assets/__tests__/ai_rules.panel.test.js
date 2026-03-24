/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

test('ai rules panel renders and saves rules', async () => {
  baseDom();
  const sample = { aiInstructions: { honestyLevel: 8, rules: [{ instructionType: 'tone', instruction: 'Be concise', priority: 10 }] }, profile: { email: 'dev@lodovi.co' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  const ruleTextarea = document.querySelector('[data-rule="0"][data-field="instruction"]');
  expect(ruleTextarea).toBeTruthy();
  expect(ruleTextarea.value).toBe('Be concise');
  ruleTextarea.value = 'Be very concise'; ruleTextarea.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.aiInstructions.rules[0].instruction).toBe('Be very concise');
  fetchMock.mockRestore();
});
