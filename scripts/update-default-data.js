#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:7071';
const SKILLS_PATH = '/api/skills';
const EXPERIENCE_PATH = '/api/experience';
const OUT_FILE = path.join(__dirname, '..', 'frontend', '_shared', 'default-data.json');

const DEFAULT_TIMEOUT = Number(process.env.TIMEOUT_MS || 60000);
const MAX_RETRIES = Number(process.env.RETRIES || 5);

async function fetchJsonWithRetries(url, timeoutMs = DEFAULT_TIMEOUT, maxRetries = MAX_RETRIES) {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt += 1;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(id);
      const isLast = attempt >= maxRetries;
      console.error(`Attempt ${attempt} failed for ${url}:`, err.message || err);
      if (isLast) throw err;
      const backoff = Math.min(30000, 500 * Math.pow(2, attempt - 1));
      console.log(`Retrying in ${backoff}ms...`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error('Exceeded retries');
}

async function main() {
  console.log(`Fetching skills from ${BASE_URL}${SKILLS_PATH}`);
  console.log(`Fetching experience from ${BASE_URL}${EXPERIENCE_PATH}`);

  let skillsData = null;
  let experienceData = null;

  try {
    skillsData = await fetchJsonWithRetries(`${BASE_URL}${SKILLS_PATH}`);
  } catch (err) {
    console.error('Failed to fetch skills after retries:', err.message || err);
  }

  try {
    experienceData = await fetchJsonWithRetries(`${BASE_URL}${EXPERIENCE_PATH}`);
  } catch (err) {
    console.error('Failed to fetch experience after retries:', err.message || err);
  }

  const out = {
    skills: (skillsData && skillsData.skills) || { strong: [], moderate: [] },
    experience: experienceData || {
      profile: {},
      experiences: [],
      skills: { strong: [], moderate: [], gap: [] },
    },
  };

  try {
    // create backup
    // ensure target directory exists
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    if (fs.existsSync(OUT_FILE)) {
      const bak = OUT_FILE + `.bak-${Date.now()}`;
      fs.copyFileSync(OUT_FILE, bak);
      console.log('Backed up existing default-data to', bak);
    }
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log('Updated', OUT_FILE);
  } catch (err) {
    console.error('Failed to write default data file:', err.message || err);
    process.exitCode = 2;
  }
}

// Node 18+ has global fetch; if not, instruct user
if (typeof fetch !== 'function') {
  console.error(
    'Global `fetch` is not available in this Node runtime. Use Node 18+ or run with a fetch polyfill.'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exitCode = 1;
});
