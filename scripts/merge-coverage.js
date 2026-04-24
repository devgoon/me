#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readSummary(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function sumTotals(sum, other) {
  if (!other) return sum;
  return {
    total: sum.total + other.total,
    covered: sum.covered + other.covered,
    skipped: sum.skipped + (other.skipped || 0),
    pct: 0,
  };
}

function toTotals(entry) {
  return {
    total: entry.total || 0,
    covered: entry.covered || 0,
    skipped: entry.skipped || 0,
    pct: entry.pct || 0,
  };
}

function mergeSummaries(files) {
  const summaries = files.map(readSummary);
  const valid = summaries.filter(Boolean);
  if (valid.length === 0) {
    console.error('No coverage summary files found.');
    process.exit(1);
  }

  const aggregated = { lines: { total: 0, covered: 0, skipped: 0, pct: 0 } };

  for (const s of valid) {
    if (s.total && s.total.lines) {
      aggregated.lines = sumTotals(aggregated.lines, toTotals(s.total.lines));
    }
  }

  if (aggregated.lines.total > 0) {
    aggregated.lines.pct = (aggregated.lines.covered / aggregated.lines.total) * 100;
  }

  const out = {
    combined: {
      lines: {
        total: aggregated.lines.total,
        covered: aggregated.lines.covered,
        pct: Number(aggregated.lines.pct.toFixed(2)),
      },
      sources: files.filter(f => fs.existsSync(f)),
    },
  };

  const outPath = path.join(process.cwd(), 'coverage', 'coverage-summary-combined.json');
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log('Combined coverage written to', outPath);
    console.log('Overall lines:', out.combined.lines.covered + '/' + out.combined.lines.total, `(${out.combined.lines.pct}%)`);
  } catch (e) {
    console.error('Failed to write combined coverage:', e.message);
    process.exit(2);
  }
}

// Expected paths (relative to repo root)
const repoRoot = process.cwd();
const apiSummary = path.join(repoRoot, 'coverage', 'coverage-summary.json');
const uiSummary = path.join(repoRoot, 'frontend-react', 'coverage', 'coverage-summary.json');

mergeSummaries([apiSummary, uiSummary]);
