const { parsePgArray, safeParseJson } = require('../../api/_shared/parse');

describe('parse utilities', () => {
  test('parsePgArray returns null for non-string', () => {
    expect(parsePgArray(null)).toBeNull();
    expect(parsePgArray(123)).toBeNull();
  });

  test('parsePgArray parses simple array', () => {
    expect(parsePgArray('{a,b,c}')).toEqual(['a', 'b', 'c']);
  });

  test('parsePgArray handles quoted and escaped values', () => {
    const input = '{"a,1","b\\"2" ,",c}';
    const out = parsePgArray(input);
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
