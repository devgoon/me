#!/usr/bin/env node
/*
 * Generate a Markdown resume by querying local API helpers.
 * - If AZURE_DATABASE_URL is set, the script will attempt to connect to the DB.
 * - Otherwise, it will use fallback mock data embedded below.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  const outDir = path.join(__dirname, '..', 'dist');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const experienceApi = require('../api/experience/index.js');
  const db = require('../api/db');

  // Build a client: real DB if available, otherwise a mock client
  let client;
  const connStr = process.env.AZURE_DATABASE_URL || null;
  if (connStr) {
    client = new db.Client({ connectionString: connStr });
    try {
      await client.connect();
    } catch (err) {
      console.error('Failed to connect to DB, falling back to mock data:', err.message || err);
      client = null;
    }
  }

  if (!client) {
    // Mock client that returns example rows compatible with loadCandidateData
    client = {
      async query(sql, params) {
        const q = String(sql || '').toLowerCase();
        if (q.includes('from candidate_profile')) {
          return { rows: [{ id: 1, name: 'Lodovico Minnocci', title: 'Cloud Architect' }] };
        }
        if (q.includes('from experiences')) {
          return {
            rows: [
              {
                id: 11,
                company_name: 'Torc Robotics',
                title: 'Senior Software Engineer',
                title_progression: null,
                start_date: '2022-01-01',
                end_date: null,
                is_current: 1,
                bullet_points: ['Built cloud-native data pipelines', 'Led observability efforts'],
                why_joined: 'To build autonomous vehicle infrastructure',
                actual_contributions: 'Architecture and delivery',
                proudest_achievement: 'Launched production pipeline',
                lessons_learned: 'Instrumentation matters',
                challenges_faced: 'Scaling and latency',
              },
              {
                id: 12,
                company_name: 'Ancera',
                title: 'Cloud Engineer',
                title_progression: null,
                start_date: '2018-06-01',
                end_date: '2021-12-31',
                is_current: 0,
                bullet_points: ['Designed infra', 'Improved CI/CD'],
                why_joined: 'Higher-impact technical ownership',
                actual_contributions: 'Platform design',
                proudest_achievement: 'Migrated core services',
                lessons_learned: 'Automation reduces toil',
                challenges_faced: 'Legacy systems',
              },
            ],
          };
        }
        if (q.includes('from skills')) {
          return {
            rows: [
              { id: 1, candidate_id: 1, skill_name: 'Azure', category: 'strong' },
              { id: 2, candidate_id: 1, skill_name: 'AWS', category: 'moderate' },
              { id: 3, candidate_id: 1, skill_name: 'DevOps', category: 'strong' },
            ],
          };
        }
        if (q.includes('from gaps_weaknesses')) {
          return { rows: [] };
        }
        // Default empty
        return { rows: [] };
      },
      async end() {},
    };
  }

  try {
    const data = await experienceApi._helpers.loadCandidateData(client);

    // Build markdown
    const md = [];
    md.push(`# ${data.profile.name}\n`);
    if (data.profile.title) md.push(`**${data.profile.title}**\n`);

    md.push('## Experience\n');
    data.experiences.forEach((e) => {
      const title = e.title || e.title_progression || '';
      const range = e.is_current ? `${e.start_date} — Present` : `${e.start_date} — ${e.end_date}`;
      md.push(`### ${e.company_name} — ${title}`);
      md.push(`_${range}_\n`);
      if (Array.isArray(e.bullet_points) && e.bullet_points.length) {
        e.bullet_points.forEach((bp) => md.push(`- ${bp}`));
      }
      md.push('\n');
    });

    md.push('## Skills\n');
    const strong = data.skills.filter((s) => s.category === 'strong').map((s) => s.skill_name);
    const moderate = data.skills.filter((s) => s.category === 'moderate').map((s) => s.skill_name);
    if (strong.length) md.push(`**Strong:** ${strong.join(', ')}\n`);
    if (moderate.length) md.push(`**Moderate:** ${moderate.join(', ')}\n`);

    const outPath = path.join(outDir, 'resume.md');
    fs.writeFileSync(outPath, md.join('\n'));
    console.log('Wrote resume to', outPath);
  } catch (err) {
    console.error('Failed to generate resume:', err && err.stack ? err.stack : err);
  } finally {
    try {
      if (client && typeof client.end === 'function') await client.end();
    } catch {}
  }
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
