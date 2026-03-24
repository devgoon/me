/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

test('skills panel binds inputs and posts numeric fields', async () => {
  baseDom();
  const sample = { skills: [{ skillName: 'Agile / Scrum', category: 'moderate', selfRating: 3, yearsExperience: '5' }], profile: { email: 'dev@lodovi.co' } };
  const fetchMock = mockFetchForPanel(sample);

  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  const self = document.querySelector('[data-skill][data-field="selfRating"]');
  const years = document.querySelector('[data-skill][data-field="yearsExperience"]');
  expect(self).toBeTruthy();
  expect(years).toBeTruthy();
  self.value = '5'; self.dispatchEvent(new Event('input', { bubbles: true }));
  years.value = '15'; years.dispatchEvent(new Event('input', { bubbles: true }));

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 10));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  const skill = payload.skills.find(s => s.skillName === 'Agile / Scrum');
  expect(skill.selfRating).toBe('5');
  expect(skill.yearsExperience).toBe('15');
  fetchMock.mockRestore();
});
