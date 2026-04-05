/** @jest-environment jsdom */
/**
 * @fileoverview UI panel tests for gaps.
 * @module tests/ui/gaps.panel.test.js
 */
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
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.gaps.length).toBe(0);
  fetchMock.mockRestore();
});

test('gaps panel can add and save a new gap', async () => {
  jest.resetModules();
  baseDom();
  // ensure add button exists in test DOM
  const addGapBtn = document.createElement('button');
  addGapBtn.id = 'add-gap';
  document.body.appendChild(addGapBtn);

  const sample = { profile: {}, gaps: [{ description: 'gap1' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  document.getElementById('add-gap').click();
  const desc = document.querySelector('[data-gap="0"][data-field="description"]');
  expect(desc).toBeTruthy();
  desc.value = 'New gap';
  desc.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.gaps.length).toBe(2);
  expect(payload.gaps[0].description).toBe('New gap');
  fetchMock.mockRestore();
});
