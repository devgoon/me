/**
 * @fileoverview Utilities for parsing small data shapes (Postgres arrays, JSON).
 * @module api/_shared/parse.js
 */

function parsePgArray(raw) {
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
  parsePgArray,
  safeParseJson
};
