/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

/**
 * @fileoverview UI panel tests for AI rules.
 * @module tests/ui/ai_rules.panel.test.js
 */

test('ai rules panel toggles and saves', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, aiInstructions: { rules: [] } };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const addRule = document.getElementById('add-ai-rule');
  expect(addRule).toBeTruthy();
  addRule.click();
  const ta = document.querySelector('[data-rule="0"][data-field="instruction"]');
  expect(ta).toBeTruthy();
  ta.value = 'rule1';
  ta.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(Array.isArray(payload.aiInstructions.rules)).toBe(true);
  expect(payload.aiInstructions.rules.length).toBeGreaterThanOrEqual(1);
  fetchMock.mockRestore();
});
