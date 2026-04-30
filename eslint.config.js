const jsdoc = require('eslint-plugin-jsdoc');

module.exports = [
  {
    ignores: [
      'node_modules/',
      'db/',
      'assets/vendor/',
      '.azurite/',
      'azurite_storage/',
      '.git/',
      '*.lock',
      '*.sql',
      'api/*.json',
      'api/package-lock.json',
      'package-lock.json',
      'dist/',
      'frontend-react/dist/',
    ],
  },
  {
    files: ['api/**/*.js'],
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'jsdoc', tagNamePreference: { fileoverview: false } } },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
      /* JSDoc rules: enforce basic presence and correctness of JSDoc on api code */
      'jsdoc/check-param-names': 'error',
      'jsdoc/newline-after-description': 'warn',
      'jsdoc/require-description': 'warn',
      'jsdoc/require-param': 'warn',
      'jsdoc/require-returns': 'warn',
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
      'id-match': [
        'error',
        '^(__[A-Za-z0-9_]+|[a-z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*|[A-Z][A-Z0-9_]*$)',
        {
          properties: false,
          onlyDeclarations: false,
          ignoreDestructuring: false,
        },
      ],
    },
  },
  {
    files: ['frontend-react/**/*.{js,jsx}', 'tests/**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-empty': 'warn',
    },
  },
];
