#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const uiFinal = path.join(repoRoot, 'frontend-react', 'coverage', 'coverage-final.json');
const outSummary = path.join(repoRoot, 'frontend-react', 'coverage', 'coverage-summary.json');

function readVitestFinal(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const obj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let total = 0;
    let covered = 0;
    for (const k of Object.keys(obj)) {
      const entry = obj[k];
      const stmts = entry.statementMap ? Object.keys(entry.statementMap).length : 0;
      const coveredCount = entry.s ? Object.values(entry.s).filter((v) => v > 0).length : 0;
      total += stmts;
      covered += coveredCount;
    }
    return { total, covered, pct: total > 0 ? (covered / total) * 100 : 0 };
  } catch (e) {
    return null;
  }
}

const data = readVitestFinal(uiFinal);
if (!data) {
  console.error('No vitest coverage-final.json found at', uiFinal);
  process.exit(1);
}

const summary = {
  total: {
    lines: {
      total: data.total || data.total === 0 ? data.total : data.total,
      covered: data.covered || data.covered === 0 ? data.covered : data.covered,
      skipped: 0,
      pct: Number((data.pct || 0).toFixed(2)),
    },
  },
};

try {
  fs.mkdirSync(path.dirname(outSummary), { recursive: true });
  fs.writeFileSync(outSummary, JSON.stringify(summary, null, 2));
  console.log('Wrote UI coverage summary to', outSummary);
  process.exit(0);
} catch (e) {
  console.error('Failed to write UI coverage summary:', e && e.message ? e.message : e);
  process.exit(2);
}
