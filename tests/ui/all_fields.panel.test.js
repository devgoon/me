/** @jest-environment jsdom */
/**
 * @fileoverview UI panel tests for all fields.
 * @module tests/ui/all_fields.panel.test.js
 */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('all fields panel renders and saves many fields', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: { fullName: 'X' }, allFields: { bio: 'old' } };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const bio = document.getElementById('all-bio');
  expect(bio.value).toBe('old');
  bio.value = 'newbio';
  bio.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('save-all').click();
  await new Promise((r) => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.allFields.bio).toBe('newbio');
  fetchMock.mockRestore();
});
