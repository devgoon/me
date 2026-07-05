/**
 * @fileoverview GitHub integration utilities for fetching public portfolio data.
 * @module api/github.js
 */

const { fetchWithTimeout } = require('./fetch');
const GITHUB_RAW_TIMEOUT_MS = 5000;

/**
 * Fetch a file from a GitHub repository.
 *
 * @param {string} owner - GitHub owner (e.g., 'devgoon')
 * @param {string} repo - Repository name (e.g., 'me')
 * @param {string} path - File path (e.g., 'README.md')
 * @param {string} ref - Branch/tag/commit (default: 'main')
 * @returns {Promise<string|null>} File contents or null if not found.
 */
async function fetchGitHubFile(owner, repo, path, ref = 'main') {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, GITHUB_RAW_TIMEOUT_MS);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Extract the portfolio summary from a README. Captures the first paragraph
 * (hook), Features section, and Tech Stack section.
 *
 * @param {string} readme - Full README content
 * @returns {Object} { hook, features, techStack, sections }
 */
function parseReadmePortfolio(readme) {
  if (!readme || typeof readme !== 'string') {
    return { hook: '', features: '', techStack: '', sections: [] };
  }

  const lines = readme.split('\n');
  const sections = [];
  let currentSection = null;
  let hookText = '';
  let hookDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Capture first non-empty paragraph as hook
    if (!hookDone && line.trim() && !line.startsWith('#')) {
      hookText += (hookText ? ' ' : '') + line.trim();
      // Stop at first blank line after hook starts
      if (hookText.length > 50 && lines[i + 1] && !lines[i + 1].trim()) {
        hookDone = true;
      }
    }

    // Extract sections
    if (line.startsWith('## ')) {
      const sectionName = line.replace(/^## /, '').trim();
      currentSection = {
        name: sectionName,
        lines: [],
      };
      sections.push(currentSection);
    } else if (currentSection) {
      if (!line.startsWith('#')) {
        currentSection.lines.push(line);
      }
    }
  }

  // Extract Features and Tech Stack sections
  const featuresSection = sections.find((s) => s.name.toLowerCase() === 'features');
  const techSection = sections.find((s) => s.name.toLowerCase() === 'tech stack');

  const features =
    featuresSection && featuresSection.lines.length
      ? featuresSection.lines.join('\n').trim().substring(0, 500)
      : '';
  const techStack =
    techSection && techSection.lines.length
      ? techSection.lines.join('\n').trim().substring(0, 300)
      : '';

  return {
    hook: hookText.substring(0, 200),
    features,
    techStack,
    sections: sections.map((s) => ({
      name: s.name,
      content: s.lines.join('\n').trim().substring(0, 300),
    })),
  };
}

/**
 * Load GitHub portfolio data and cache it. Used by chat/fit endpoints
 * to include the candidate's public GitHub repo as context.
 *
 * @param {Object} opts - { owner, repo, ref, client }
 * @param {string} opts.owner - GitHub owner
 * @param {string} opts.repo - Repository name
 * @param {string} opts.ref - Branch (default: 'main')
 * @param {import('./db').Client} opts.client - DB client for caching
 * @returns {Promise<Object>} { hook, features, techStack, url }
 */
async function loadGitHubContext(opts = {}) {
  const { owner = 'devgoon', repo = 'me', ref = 'main', client } = opts;
  const repoUrl = `https://github.com/${owner}/${repo}`;

  // Try to fetch README
  const readme = await fetchGitHubFile(owner, repo, 'README.md', ref);
  if (!readme) {
    return {
      hook: '',
      features: '',
      techStack: '',
      url: repoUrl,
    };
  }

  const { hook, features, techStack } = parseReadmePortfolio(readme);

  // Optionally cache in DB (if client provided and a cache table exists)
  if (client && hook) {
    try {
      await client.queryWithRetry(
        `MERGE github_portfolio_cache AS target
           USING (SELECT @p1 AS owner, @p2 AS repo, @p3 AS ref, @p4 AS hook, @p5 AS features, @p6 AS tech_stack, GETUTCDATE() AS updated_at) AS src
           ON target.owner = src.owner AND target.repo = src.repo AND target.ref = src.ref
           WHEN MATCHED THEN
             UPDATE SET hook = src.hook, features = src.features, tech_stack = src.tech_stack, updated_at = src.updated_at
           WHEN NOT MATCHED THEN
             INSERT (owner, repo, ref, hook, features, tech_stack, updated_at)
             VALUES (src.owner, src.repo, src.ref, src.hook, src.features, src.tech_stack, src.updated_at)`,
        [owner, repo, ref, hook, features, techStack]
      );
    } catch {
      // Table may not exist; fail gracefully
    }
  }

  return { hook, features, techStack, url: repoUrl };
}

module.exports = {
  fetchGitHubFile,
  parseReadmePortfolio,
  loadGitHubContext,
};
