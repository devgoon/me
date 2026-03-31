/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../helpers');

test('education panel renders items and allows adding a new entry', async () => {
  jest.resetModules();
  baseDom();
  const sample = { profile: {}, education: [{ institution: 'Uni', degree: 'BSc' }] };
  const fetchMock = mockFetchForPanel(sample);
  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  expect(document.querySelector('[data-edu="0"][data-field="institution"]').value).toBe('Uni');
  document.getElementById('add-education').click();
  const newSchool = document.querySelector('[data-edu="1"][data-field="institution"]');
  expect(newSchool).toBeTruthy();
  newSchool.value = 'New Uni';

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.education.length).toBe(2);
  expect(payload.education[1].school).toBe('New Uni');
  fetchMock.mockRestore();
});

test('education panel renders and saves entries (institution)', async () => {
  jest.resetModules();
  baseDom();
  const sample = { education: [{ institution: 'Uni', degree: 'MS', fieldOfStudy: 'CS' }], profile: { email: 'dev@lodovi.co' }};
  const fetchMock = mockFetchForPanel(sample);

  require('../../frontend/assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  const inst = document.querySelector('[data-edu="0"][data-field="institution"]');
  expect(inst).toBeTruthy();
  expect(inst.value).toBe('Uni');
  inst.value = 'State Univ'; inst.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(payload.education[0].institution).toBe('State Univ');
  fetchMock.mockRestore();
});
