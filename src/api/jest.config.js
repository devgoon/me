module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/__tests__/**/*.test.(ts|js)'],
  moduleDirectories: ['node_modules', '<rootDir>'],
  // Ignore compiled top-level api/ output to prevent duplicate/compiled tests from
  // being discovered and causing module resolution issues in CI.
  modulePathIgnorePatterns: ['<rootDir>/../api/'],
  testPathIgnorePatterns: ['<rootDir>/../api/'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  }
};
