/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../../assets/test/helpers');

function setElementValue(el, value) {
  if (!el) return;
  if (el.type === 'checkbox') {
    el.checked = Boolean(value);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (el.tagName === 'SELECT') {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

test('certifications panel renders and round-trips save payload', async () => {
  jest.resetModules();
  baseDom();
  // ensure certifications container exists for render
  const certContainer = document.createElement('div');
  certContainer.id = 'certifications-list';
  document.body.appendChild(certContainer);

  const sample = {
    profile: { fullName: 'L', email: 'dev@lodovi.co' },
    certifications: [{ name: 'Cert One', issuer: 'Issuer A', issueDate: '2021-01-01', credentialId: 'ABC' }]
  };

  const fetchMock = mockFetchForPanel(sample);
  require('../../assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  // inputs should be rendered for certification 0
  const nameInput = document.querySelector('[data-cert="0"][data-field="name"]');
  const issuerInput = document.querySelector('[data-cert="0"][data-field="issuer"]');
  const credentialInput = document.querySelector('[data-cert="0"][data-field="credentialId"]');
  expect(nameInput).toBeTruthy();
  expect(issuerInput).toBeTruthy();
  expect(credentialInput).toBeTruthy();
  expect(nameInput.value).toBe('Cert One');
  expect(issuerInput.value).toBe('Issuer A');
  expect(credentialInput.value).toBe('ABC');

  // modify the name and save
  setElementValue(nameInput, 'Cert One Updated');
  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  expect(calls.length).toBeGreaterThan(0);
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  expect(Array.isArray(payload.certifications)).toBe(true);
  expect(payload.certifications[0].name).toBe('Cert One Updated');

  fetchMock.mockRestore();
});

test('certifications panel remove then save results in empty certifications array', async () => {
  jest.resetModules();
  baseDom();
  const certContainer = document.createElement('div');
  certContainer.id = 'certifications-list';
  document.body.appendChild(certContainer);

  const sample = {
    profile: { fullName: 'L', email: 'dev@lodovi.co' },
    certifications: [{ name: 'ToRemove', issuer: 'X' }]
  };

  const fetchMock = mockFetchForPanel(sample);
  require('../../assets/js/admin');
  await waitForMessageContains('Admin data loaded.');

  // click remove
  const removeBtn = document.querySelector('[data-remove-cert]');
  expect(removeBtn).toBeTruthy();
  removeBtn.click();

  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  expect(calls.length).toBeGreaterThan(0);
  const payload = JSON.parse(calls[calls.length - 1][1].body);
  // after removal, certifications should be empty array
  expect(Array.isArray(payload.certifications)).toBe(true);
  expect(payload.certifications.length).toBe(0);

  fetchMock.mockRestore();
});
