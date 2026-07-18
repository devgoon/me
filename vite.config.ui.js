import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootNodeModules = path.resolve(__dirname, 'node_modules');
const frontendNodeModules = path.resolve(__dirname, 'frontend-react/node_modules');

function resolvePkg(pkg) {
  const rootPath = path.resolve(rootNodeModules, pkg);
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }
  return path.resolve(frontendNodeModules, pkg);
}

export default {
  resolve: {
    alias: [
      { find: /^react$/, replacement: resolvePkg('react') },
      {
        find: /^react-dom$/,
        replacement: resolvePkg('react-dom'),
      },
      {
        find: 'react-router-dom',
        replacement: resolvePkg('react-router-dom'),
      },
      {
        find: '@tanstack/react-query',
        replacement: resolvePkg('@tanstack/react-query'),
      },
      {
        find: '@testing-library/react',
        replacement: resolvePkg('@testing-library/react'),
      },
      {
        find: '@testing-library/user-event',
        replacement: resolvePkg('@testing-library/user-event'),
      },
      {
        find: '@testing-library/jest-dom',
        replacement: resolvePkg('@testing-library/jest-dom'),
      },
      { find: '/frontend-react/node_modules', replacement: frontendNodeModules },
    ],
  },
  test: {
    root: '.',
    environment: 'jsdom',
    setupFiles: './tests/ui/setup.js',
    include: ['./tests/ui/**/*.test.jsx'],
  },
};
