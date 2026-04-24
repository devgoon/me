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
    ],
  },
  {
    files: ['api/**/*.js', 'assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
    },
    rules: {
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
];
