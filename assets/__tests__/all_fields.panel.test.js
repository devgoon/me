/** @jest-environment jsdom */
const { baseDom, mockFetchForPanel, waitForMessageContains } = require('../test/helpers');

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

function getPathForElement(el) {
  if (el.dataset.exp !== undefined) return ['experiences', Number(el.dataset.exp), el.dataset.field];
  if (el.dataset.skill !== undefined) return ['skills', Number(el.dataset.skill), el.dataset.field];
  if (el.dataset.edu !== undefined) return ['education', Number(el.dataset.edu), el.dataset.field];
  if (el.dataset.gap !== undefined) return ['gaps', Number(el.dataset.gap), el.dataset.field];
  if (el.dataset.faq !== undefined) return ['faq', Number(el.dataset.faq), el.dataset.field];
  if (el.dataset.rule !== undefined) return ['aiInstructions', 'rules', Number(el.dataset.rule), el.dataset.field];
  if (el.id && el.id.startsWith('profile-')) return ['profile', el.id.replace(/^profile-/, '')];
  if (el.id && el.id.startsWith('values-')) return ['valuesCulture', el.id.replace(/^values-/, '')];
  if (el.id === 'ai-honestyLevel') return ['aiInstructions', 'honestyLevel'];
  return null;
}

function setDeep(obj, path, value) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    if (cur[p] === undefined) cur[p] = typeof path[i+1] === 'number' ? [] : {};
    cur = cur[p];
  }
  cur[path[path.length - 1]] = value;
}

function getDeep(obj, path) {
  let cur = obj;
  for (const p of path) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

test('admin panel round-trips every input field into POST payload', async () => {
  baseDom();
  // prepare a sample with one item in each array so DOM renders inputs
  const sample = {
    profile: { fullName: 'L', email: 'dev@lodovi.co', currentTitle: 'SWE' },
    experiences: [{ companyName: 'Acme', title: 'Eng', startDate: '2020-01-01', current: false }],
    skills: [{ skillName: 'Node', category: 'moderate', selfRating: 3, yearsExperience: '2', lastUsed: '2023-01-01' }],
    education: [{ institution: 'Uni', degree: 'BS' }],
    gaps: [{ description: 'Rust', interestedInLearning: false }],
    faq: [{ question: 'Q', answer: 'A' }],
    aiInstructions: { honestyLevel: 7, rules: [{ instructionType: 'tone', instruction: 'Be clear', priority: 10 }] },
    valuesCulture: { mustHaves: 'Team', dealbreakers: '' }
  };

  const fetchMock = mockFetchForPanel(sample);
  // load admin client
  require('../js/admin');
  await waitForMessageContains('Admin data loaded.');

  // collect all editable elements
  const edits = [];
  const selector = '[data-exp],[data-skill],[data-edu],[data-gap],[data-faq],[data-rule],#ai-honestyLevel,[id^="profile-"],[id^="values-"]';
  const nodes = Array.from(document.querySelectorAll(selector));

  // assign deterministic updated values and record expected payload entries
  const expected = {};
  nodes.forEach((el) => {
    const path = getPathForElement(el);
    if (!path) return;
    // choose value based on input type
    let value;
    if (el.type === 'checkbox') value = true;
    else if (el.tagName === 'SELECT') {
      const opt = el.querySelector('option');
      value = opt ? opt.value : (el.options && el.options[0] ? el.options[0].value : '');
    }
    else if (el.type === 'number') value = '9';
    else if (el.type === 'date') value = '2022-02-02';
    else value = `${path[path.length-1]}-updated`;
    setElementValue(el, value);
    // normalize aiInstructions.honestyLevel to number
    if (path.length === 2 && path[0] === 'aiInstructions' && path[1] === 'honestyLevel') {
      setDeep(expected, ['aiInstructions','honestyLevel'], Number(value));
    } else if (path[0] === 'aiInstructions' && path[1] === 'rules') {
      setDeep(expected, ['aiInstructions','rules', path[2], path[3]], value);
    } else {
      setDeep(expected, path, value);
    }
  });

  // click save
  document.getElementById('save-all').click();
  await new Promise(r => setTimeout(r, 20));

  const calls = fetchMock.mock.calls.filter(c => String(c[0]).endsWith('/api/panel-data'));
  expect(calls.length).toBeGreaterThan(0);
  const payload = JSON.parse(calls[calls.length - 1][1].body);

  // check each expected path exists in payload and equals value
  function assertPath(p, v) {
    const got = getDeep(payload, p);
    // coerce numbers to numbers where necessary
    if (typeof v === 'number') {
      expect(Number(got)).toBe(v);
    } else {
      expect(got).toBe(v);
    }
  }

  // traverse expected and assert
  function traverse(obj, curPath = []) {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      for (const k of Object.keys(obj)) traverse(obj[k], curPath.concat(k));
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => traverse(item, curPath.concat(i)));
    } else {
      assertPath(curPath, obj);
    }
  }

  traverse(expected);
  fetchMock.mockRestore();
});
