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
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let sql = '-- Exported from live database\n';
  sql += '-- Generated at ' + new Date().toISOString() + '\n';
  sql += 'BEGIN;\n\n';
  sql += 'TRUNCATE TABLE\n  ai_instructions,\n  faq_responses,\n  values_culture,\n  gaps_weaknesses,\n  skills,\n  experiences,\n  admin_users,\n  candidate_profile\nRESTART IDENTITY CASCADE;\n\n';

  for (const table of tables) {
    const res = await client.query(`SELECT * FROM ${table}`);
    if (res.rows.length === 0) continue;
    sql += `-- ${table}: ${res.rows.length} row(s)\n`;
    const cols = Object.keys(res.rows[0]);
    for (const row of res.rows) {
      sql += `INSERT INTO ${table} (${cols.join(', ')}) VALUES\n  (`;
      sql += cols.map((col) => sqlValue(row[col])).join(', ');
      sql += ');\n';
    }
    sql += '\n';
  }

  sql += 'COMMIT;\n';
  await client.end();
  fs.writeFileSync(path.join(__dirname, '../db/export.sql'), sql);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});