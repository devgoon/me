module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { 'args': 'none', 'ignoreRestSiblings': true }],
    'no-empty': ['warn', { 'allowEmptyCatch': true }]
  }
};
