/** @jest-environment jsdom */
/**
 * @fileoverview UI panel tests for FAQ.
 * @module tests/ui/faq.panel.test.js
 */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('faq panel can add and save questions', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, faq: [{ q: 'Q1', a: 'A1' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  document.getElementById('add-faq').click();
  const q = document.querySelector('[data-faq="1"][data-field="question"]');
  const a = document.querySelector('[data-faq="1"][data-field="answer"]');
  expect(q).toBeTruthy();
  q.value = 'New Q';
  a.value = 'New A';
  q.dispatchEvent(new Event('input', { bubbles: true }));
  a.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.faq.length).toBe(2);
  expect(payload.faq[1].question).toBe('New Q');
  fetchMock.mockRestore();
});

test('faq panel renders items and saves changes', async () => {
  jest.resetModules();
  baseDom();
  const sample = { faq: [{ question: 'Q1', answer: 'A1', isCommonQuestion: true }], profile: { email: 'dev@lodovi.co' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../../frontend/assets/js/admin');
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
