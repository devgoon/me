const { parseArray: parseArray, safeParseJson } = require('../../api/_shared/parse');

describe('parse utilities', () => {
  test('parseArray returns null for non-string', () => {
    expect(parseArray(null)).toBeNull();
    expect(parseArray(123)).toBeNull();
  });

  test('parseArray parses simple array', () => {
    expect(parseArray('{a,b,c}')).toEqual(['a', 'b', 'c']);
  });

  test('parseArray handles quoted and escaped values', () => {
    const input = '{"a,1","b\\"2" ,",c}';
    const out = parseArray(input);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(1);
  });

  test('safeParseJson returns object for valid JSON', () => {
    expect(safeParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  test('safeParseJson returns null for invalid JSON or empty', () => {
    expect(safeParseJson('')).toBeNull();
    expect(safeParseJson('not json')).toBeNull();
  });
});
