import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveModule(...parts) {
  const local = path.resolve(__dirname, 'node_modules', ...parts);
  if (require('fs').existsSync(local)) return local;
  return path.resolve(__dirname, '..', 'node_modules', ...parts);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'react', replacement: resolveModule('react') },
      { find: 'react-dom', replacement: resolveModule('react-dom') },
      { find: 'react-router-dom', replacement: resolveModule('react-router-dom') },
      { find: '@tanstack/react-query', replacement: resolveModule('@tanstack', 'react-query') },
      { find: '@testing-library/react', replacement: resolveModule('@testing-library', 'react') },
      {
        find: '@testing-library/user-event',
        replacement: resolveModule('@testing-library', 'user-event'),
      },
      {
        find: '@testing-library/jest-dom',
        replacement: resolveModule('@testing-library', 'jest-dom'),
      },
    ],
  },
  test: {
    root: '..',
    environment: 'jsdom',
    setupFiles: './tests/ui/setup.js',
    include: ['./tests/ui/**/*.test.jsx'],
  },
});
