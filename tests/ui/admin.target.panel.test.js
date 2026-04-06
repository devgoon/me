/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('target titles can be added and saved', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: { targetTitles: ['Existing'] } };
  const fetchMock = mockFetchForPanel(sample);
  // ensure the target title list container exists for rendering
  const targetList = document.createElement('ul');
  targetList.id = 'target-title-list';
  document.body.appendChild(targetList);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const input = document.getElementById('target-title-input');
  input.value = 'New Target';
  document.getElementById('add-target-title').click();

  // ensure the new title rendered in list
  const listItem = document.querySelector('#target-title-list li');
  expect(listItem).toBeTruthy();

  document.getElementById('save-all').click();
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(Array.isArray(payload.profile.targetTitles)).toBe(true);
  expect(payload.profile.targetTitles).toContain('New Target');
  fetchMock.mockRestore();
});
