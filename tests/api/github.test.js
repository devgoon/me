const { parseReadmePortfolio, fetchGitHubFile, loadGitHubContext } = require('../../api/github');

describe('api/github', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.fetch;
  });

  describe('parseReadmePortfolio', () => {
    test('extracts hook, features, and tech stack from complete README', () => {
      const readme = `# My Portfolio

An interactive site for showcasing work.

## Features

- Feature one
- Feature two with details
- Feature three

## Tech Stack

- Node.js backend
- React frontend
- PostgreSQL database

## Other Section

Some other content here.`;

      const result = parseReadmePortfolio(readme);
      expect(result.hook).toBeTruthy();
      expect(result.hook).toMatch(/interactive site/);
      expect(result.features).toMatch(/Feature one/);
      expect(result.features).toMatch(/Feature two/);
      expect(result.techStack).toMatch(/Node.js/);
      expect(result.techStack).toMatch(/React/);
    });

    test('handles missing sections gracefully', () => {
      const readme = `# My Project

Just a project with no sections.`;

      const result = parseReadmePortfolio(readme);
      expect(result.hook).toBeTruthy();
      expect(result.features).toBe('');
      expect(result.techStack).toBe('');
      expect(result.sections.length).toBeGreaterThanOrEqual(0);
    });

    test('returns empty object for null/undefined input', () => {
      expect(parseReadmePortfolio(null)).toEqual({
        hook: '',
        features: '',
        techStack: '',
        sections: [],
      });
      expect(parseReadmePortfolio(undefined)).toEqual({
        hook: '',
        features: '',
        techStack: '',
        sections: [],
      });
    });

    test('truncates long sections to reasonable length', () => {
      const veryLongFeatures = `- ${Array(100).fill('feature').join(' ')}\n`.repeat(10);
      const readme = `# Project\n\nHook text.\n\n## Features\n\n${veryLongFeatures}`;

      const result = parseReadmePortfolio(readme);
      expect(result.features.length).toBeLessThanOrEqual(500);
    });

    test('captures hook up to first blank line', () => {
      const readme = `# Project

This is the hook.
It can span multiple lines.

## Features

- Feature one`;

      const result = parseReadmePortfolio(readme);
      expect(result.hook).toContain('hook');
      expect(result.hook).toMatch(/multiple lines/);
    });

    test('extracts multiple sections', () => {
      const readme = `# Project

Hook.

## Features

Content here.

## Tech Stack

Tech here.

## Architecture

Architecture content.`;

      const result = parseReadmePortfolio(readme);
      expect(result.sections.length).toBeGreaterThanOrEqual(3);
      expect(result.sections.some((s) => s.name.toLowerCase().includes('features'))).toBe(true);
      expect(result.sections.some((s) => s.name.toLowerCase().includes('architecture'))).toBe(true);
    });
  });

  describe('fetchGitHubFile', () => {
    test('fetches and returns file content on success', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => '# README\n\nContent',
        })
      );

      const content = await fetchGitHubFile('devgoon', 'me', 'README.md');
      expect(content).toBe('# README\n\nContent');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('raw.githubusercontent.com'),
        expect.any(Object)
      );
    });

    test('returns null on 404 Not Found', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      );

      const content = await fetchGitHubFile('devgoon', 'me', 'MISSING.md');
      expect(content).toBeNull();
    });

    test('returns null on network error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const content = await fetchGitHubFile('devgoon', 'me', 'README.md');
      expect(content).toBeNull();
    });

    test('uses main branch by default', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => 'content',
        })
      );

      await fetchGitHubFile('devgoon', 'me', 'README.md');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/main/'),
        expect.any(Object)
      );
    });

    test('uses custom ref when provided', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => 'content',
        })
      );

      await fetchGitHubFile('devgoon', 'me', 'README.md', 'develop');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/develop/'),
        expect.any(Object)
      );
    });
  });

  describe('loadGitHubContext', () => {
    test('returns empty context when fetch fails', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const context = await loadGitHubContext({
        owner: 'devgoon',
        repo: 'me',
      });

      expect(context.hook).toBe('');
      expect(context.features).toBe('');
      expect(context.techStack).toBe('');
      expect(context.url).toBe('https://github.com/devgoon/me');
    });

    test('parses and returns GitHub context when README is available', async () => {
      const mockReadme = `# My Project

An awesome AI portfolio.

## Features

- Chat interface
- Fit analyzer

## Tech Stack

- Claude API
- React`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => mockReadme,
        })
      );

      const context = await loadGitHubContext({
        owner: 'devgoon',
        repo: 'me',
      });

      expect(context.hook).toMatch(/awesome AI portfolio/);
      expect(context.features).toMatch(/Chat interface/);
      expect(context.techStack).toMatch(/Claude API/);
      expect(context.url).toBe('https://github.com/devgoon/me');
    });

    test('uses default owner and repo', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => '# Test',
        })
      );

      await loadGitHubContext({});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('devgoon/me'),
        expect.any(Object)
      );
    });

    test('includes custom repo URL in response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => '# Test\n\nHook',
        })
      );

      const context = await loadGitHubContext({
        owner: 'custom-org',
        repo: 'custom-repo',
      });

      expect(context.url).toBe('https://github.com/custom-org/custom-repo');
    });

    test('gracefully handles database cache failures', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => '# Test\n\nContent here.',
        })
      );

      const mockClient = {
        queryWithRetry: vi.fn(() => Promise.reject(new Error('Table not found'))),
      };

      const context = await loadGitHubContext({
        owner: 'devgoon',
        repo: 'me',
        client: mockClient,
      });

      // Should still return parsed context even if caching fails
      expect(context.hook).toMatch(/Content here/);
    });

    test('caches result in database when client provided', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: async () => '# Test\n\nCacheable content.',
        })
      );

      const mockClient = {
        queryWithRetry: vi.fn(() => Promise.resolve({ rows: [] })),
      };

      await loadGitHubContext({
        owner: 'devgoon',
        repo: 'me',
        client: mockClient,
      });

      expect(mockClient.queryWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('MERGE github_portfolio_cache'),
        expect.any(Array)
      );
    });
  });
});
