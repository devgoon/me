const fs = require('fs');
const path = require('path');

function parseSummary(html) {
  const metrics = ['Statements','Branches','Functions','Lines'];
  const result = {};
  for (const m of metrics) {
    const re = new RegExp(`<span class="strong">\\s*([^<%]+)%\\s*<\\/span>\\s*<span class="quiet">\\s*${m}\\s*<\\/span>\\s*<span class='fraction'>([^<]+)<\\/span>`, 'i');
    const match = html.match(re);
    if (match) {
      result[m.toLowerCase()] = { pct: match[1].trim() + '%', raw: match[2].trim() };
    }
  }
  return result;
}

function printReport(title, htmlPath) {
  if (!fs.existsSync(htmlPath)) {
    console.warn(`${title}: report not found at ${htmlPath}`);
    return;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const summary = parseSummary(html);
  console.log('\n' + title + ':');
  if (!Object.keys(summary).length) {
    console.log('  (no summary found)');
    return;
  }
  console.log(`  Statements: ${summary.statements ? summary.statements.pct + ' (' + summary.statements.raw + ')' : 'n/a'}`);
  console.log(`  Branches:   ${summary.branches ? summary.branches.pct + ' (' + summary.branches.raw + ')' : 'n/a'}`);
  console.log(`  Functions:  ${summary.functions ? summary.functions.pct + ' (' + summary.functions.raw + ')' : 'n/a'}`);
  console.log(`  Lines:      ${summary.lines ? summary.lines.pct + ' (' + summary.lines.raw + ')' : 'n/a'}`);
}

const rootReport = path.join(process.cwd(), 'coverage', 'lcov-report', 'index.html');
const apiReport = path.join(process.cwd(), 'coverage', 'lcov-report', 'api', 'index.html');
const assetsReport = path.join(process.cwd(), 'coverage', 'lcov-report', 'assets', 'index.html');

console.log('Coverage summary (console):');
printReport('All files', rootReport);
printReport('API', apiReport);
printReport('Assets', assetsReport);

// Also print path to HTML report for more detail
console.log('\nFull HTML report: ' + rootReport);
