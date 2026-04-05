/** @jest-environment jsdom */
/**
 * @fileoverview UI panel tests for experiences.
 * @module tests/ui/experiences.panel.test.js
 */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('experiences panel saves updated title', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, experiences: [{ companyName: 'SomeCo', title: 'Old' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const title = document.querySelector('[data-exp="0"][data-field="title"]');
  expect(title.value).toBe('Old');
  title.value = 'New Title';
  title.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('save-all').click();
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.experiences[0].title).toBe('New Title');
  fetchMock.mockRestore();
});

test('experiences panel can add and save a new entry', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, experiences: [{ companyName: 'SomeCo', title: 'Old' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  // click add (prepended)
  document.getElementById('add-experience').click();
  const company = document.querySelector('[data-exp="0"][data-field="companyName"]');
  expect(company).toBeTruthy();
  company.value = 'NewCo';
  company.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.experiences.length).toBe(2);
  expect(payload.experiences[0].companyName).toBe('NewCo');
  fetchMock.mockRestore();
});
