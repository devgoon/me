/**
 * @fileoverview Utilities for parsing small data shapes (Postgres arrays, JSON).
 * @module api/_shared/parse.js
 */

/**
 * Parse a Postgres-style array string (e.g. "{a,b,\"c,d\"}") into a JS array.
 * If input is already an array it is returned unchanged. Returns null for
 * invalid inputs.
 *
 * @param {string|Array|null|undefined} raw - The raw value returned from Postgres.
 * @returns {Array|null} Parsed array or null when input can't be parsed.
 */
function parseArray(raw) {
  if (raw === null || raw === undefined) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s.startsWith('{') || !s.endsWith('}')) return null;
  const inner = s.slice(1, -1);
  if (inner.trim() === '') return [];
  const out = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    const prev = inner[i - 1];
    if (ch === '"' && prev !== '\\') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(curr);
      curr = '';
      continue;
    }
    curr += ch;
  }
  out.push(curr);
  return out.map((it) => it.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim()).filter(Boolean);
}

/**
 * Safely parse JSON-like input. If the input is already an object it is
 * returned as-is. Returns null for non-strings or when JSON parse fails.
 *
 * @param {string|Object|null|undefined} raw - JSON string or already-parsed object.
 * @returns {Object|null} Parsed object or null on failure.
 */
function safeParseJson(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (s === '') return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

module.exports = {
  parseArray,
  // Backwards-compatible alias used by tests and older modules
  parsePgArray: parseArray,
  safeParseJson,
};
