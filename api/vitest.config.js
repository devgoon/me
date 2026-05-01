const { defineConfig } = require('vitest/config');
const path = require('path');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['../tests/setupTests.js'],
    include: ['../tests/api/**/*.test.js', '../tests/api/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['json-summary', 'lcov'],
      // write API coverage summary into repo-level coverage folder so merge script can find it
      reportsDirectory: path.resolve(__dirname, '..', 'coverage'),
    },
  },
});
