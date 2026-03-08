const fs = require('fs');
const path = require('path');
const { Client } = require('../api/node_modules/pg');

const tables = [
  'candidate_profile',
  'experiences',
  'skills',
  'gaps_weaknesses',
  'values_culture',
  'faq_responses',
  'ai_instructions',
  'admin_users'
];

function esc(str) {
  return String(str).replace(/'/g, "''");
}

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'ARRAY[]::text[]';
    return `ARRAY[${v.map((x) => sqlValue(x)).join(', ')}]`;
  }
  if (typeof v === 'object') {
    const json = esc(JSON.stringify(v));
    return `'${json}'::jsonb`;
  }
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : 'NULL';
  }
  if (typeof v === 'boolean') {
    return v ? 'TRUE' : 'FALSE';
  }
  return `'${esc(v)}'`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const lines = [];
  lines.push('-- Seed generated from live database');
  lines.push('-- Generated at ' + new Date().toISOString());
  lines.push('BEGIN;');
  lines.push('');
  lines.push('TRUNCATE TABLE');
  lines.push('  ai_instructions,');
  lines.push('  faq_responses,');
  lines.push('  values_culture,');
  lines.push('  gaps_weaknesses,');
  lines.push('  skills,');
  lines.push('  experiences,');
  lines.push('  admin_users,');
  lines.push('  candidate_profile');
  lines.push('RESTART IDENTITY CASCADE;');
  lines.push('');

  for (const table of tables) {
    const result = await client.query(`SELECT * FROM ${table} ORDER BY id ASC`);
    if (!result.rows.length) {
      lines.push(`-- ${table}: 0 rows`);
      lines.push('');
      continue;
    }

    const cols = Object.keys(result.rows[0]);
    lines.push(`-- ${table}: ${result.rows.length} row(s)`);
    lines.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES`);

    const valueRows = result.rows.map((row) => {
      const vals = cols.map((c) => sqlValue(row[c]));
      return `  (${vals.join(', ')})`;
    });

    lines.push(valueRows.join(',\n') + ';');
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');

  fs.writeFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), lines.join('\n'));
  await client.end();

  console.log('db/seed.sql regenerated from live database');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
