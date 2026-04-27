import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  resolve: {
    alias: [
      { find: 'react', replacement: path.resolve(__dirname, 'frontend-react/node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'frontend-react/node_modules/react-dom') },
      { find: 'react-router-dom', replacement: path.resolve(__dirname, 'frontend-react/node_modules/react-router-dom') },
      { find: '@tanstack/react-query', replacement: path.resolve(__dirname, 'frontend-react/node_modules/@tanstack/react-query') },
      { find: '@testing-library/react', replacement: path.resolve(__dirname, 'frontend-react/node_modules/@testing-library/react') },
      { find: '@testing-library/user-event', replacement: path.resolve(__dirname, 'frontend-react/node_modules/@testing-library/user-event') },
      { find: '@testing-library/jest-dom', replacement: path.resolve(__dirname, 'frontend-react/node_modules/@testing-library/jest-dom') },
    ],
  },
  test: {
    root: '.',
    environment: 'jsdom',
    setupFiles: './tests/ui/setup.js',
    include: ['./tests/ui/**/*.test.jsx'],
  },
};
