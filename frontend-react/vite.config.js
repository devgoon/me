import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'react', replacement: path.resolve(__dirname, '..', 'node_modules', 'react') },
      {
        find: 'react-dom',
        replacement: path.resolve(__dirname, '..', 'node_modules', 'react-dom'),
      },
      {
        find: 'react-router-dom',
        replacement: path.resolve(__dirname, '..', 'node_modules', 'react-router-dom'),
      },
      {
        find: '@tanstack/react-query',
        replacement: path.resolve(__dirname, '..', 'node_modules', '@tanstack', 'react-query'),
      },
      {
        find: '@testing-library/react',
        replacement: path.resolve(__dirname, '..', 'node_modules', '@testing-library', 'react'),
      },
      {
        find: '@testing-library/user-event',
        replacement: path.resolve(
          __dirname,
          '..',
          'node_modules',
          '@testing-library',
          'user-event'
        ),
      },
      {
        find: '@testing-library/jest-dom',
        replacement: path.resolve(__dirname, '..', 'node_modules', '@testing-library', 'jest-dom'),
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
