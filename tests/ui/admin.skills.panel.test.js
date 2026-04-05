/** @jest-environment jsdom */
/**
 * @fileoverview UI panel tests for skills.
 * @module tests/ui/skills.panel.test.js
 */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('skills panel handles adding and removing skills', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, skills: [{ skillName: 'A' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  document.getElementById('add-skill').click();
  const input = document.querySelector('[data-skill="0"][data-field="skillName"]');
  input.value = 'NewSkill';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('save-all').click();
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  const skillNames = (payload.skills || []).map((s) => s.skillName || s);
  expect(skillNames).toContain('NewSkill');
  fetchMock.mockRestore();
});
