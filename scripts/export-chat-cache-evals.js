#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Client } = require('../api/db');

function parseArgs(argv) {
  const args = {
    limit: 50,
    minHits: 1,
    onlyActive: false,
    out: 'tests/evals/fixtures/chat-eval-cases.generated.json',
  };

  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i];
    const next = argv[i + 1];

    if (cur === '--limit' && next) {
      args.limit = Number(next);
      i += 1;
      continue;
    }
    if (cur === '--min-hits' && next) {
      args.minHits = Number(next);
      i += 1;
      continue;
    }
    if (cur === '--out' && next) {
      args.out = next;
      i += 1;
      continue;
    }
    if (cur === '--only-active') {
      args.onlyActive = true;
      continue;
    }
  }

  if (!Number.isInteger(args.limit) || args.limit <= 0 || args.limit > 5000) {
    throw new Error('--limit must be an integer between 1 and 5000');
  }
  if (!Number.isInteger(args.minHits) || args.minHits <= 0 || args.minHits > 1000000) {
    throw new Error('--min-hits must be an integer between 1 and 1000000');
  }

  return args;
}

function redactSensitiveText(value) {
  const input = String(value || '');
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[REDACTED_PHONE]')
    .replace(/\bhttps?:\/\/\S+/gi, '[REDACTED_URL]');
}

function compact(value, maxChars) {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

function toCase(row, index) {
  const question = compact(redactSensitiveText(row.question), 1200);
  const answer = compact(redactSensitiveText(row.response), 2200);
  const shortHash = String(row.hash || '').slice(0, 10);

  return {
    id: `chat-cache-${String(index + 1).padStart(3, '0')}`,
    description: `Draft case from ai_response_cache hash ${shortHash}`,
    source: {
      table: 'ai_response_cache',
      hash: row.hash,
      model: row.model,
      cacheHitCount: row.cache_hit_count,
      lastAccessed: row.last_accessed,
      updatedAt: row.updated_at,
      invalidatedAt: row.invalidated_at,
    },
    input: {
      question,
    },
    expected: {
      // Baseline expectations you can tune manually per case.
      minLength: 40,
      forbiddenTerms: ['as an ai language model'],
      shouldAvoidHallucination: true,
    },
    modelResponse: {
      response: answer,
    },
  };
}

async function fetchRows(client, limit, minHits, onlyActive) {
  const safeLimit = Math.max(1, Math.min(5000, Number(limit)));
  const safeMinHits = Math.max(1, Math.min(1000000, Number(minHits)));

  // TOP cannot be parameterized consistently across drivers, so limit is validated and inlined.
  const sql = `
    SELECT TOP ${safeLimit}
      hash,
      model,
      question,
      response,
      cache_hit_count,
      CONVERT(varchar(33), last_accessed, 126) AS last_accessed,
      CONVERT(varchar(33), updated_at, 126) AS updated_at,
      CONVERT(varchar(33), invalidated_at, 126) AS invalidated_at
    FROM ai_response_cache
    WHERE is_cached = 1
      ${onlyActive ? 'AND invalidated_at IS NULL' : ''}
      AND cache_hit_count >= @p1
      AND LEN(LTRIM(RTRIM(ISNULL(question, '')))) > 0
      AND LEN(LTRIM(RTRIM(ISNULL(response, '')))) > 0
    ORDER BY last_accessed DESC
  `;

  const result = await client.queryWithRetry(sql, [safeMinHits]);
  return result.rows || [];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(args.out);

  const client = new Client({ connectionString: process.env.AZURE_DATABASE_URL });
  await client.connect();

  try {
    const rows = await fetchRows(client, args.limit, args.minHits, args.onlyActive);
    const cases = rows.map(toCase);

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(cases, null, 2) + '\n', 'utf8');

    console.log(`Exported ${cases.length} draft chat eval cases to ${outPath}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Failed to export chat cache eval cases:', err.message || err);
  process.exit(1);
});
