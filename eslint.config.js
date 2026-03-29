module.exports = [
  {
    files: ["api/**/*.js", "assets/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "warn",
      "no-empty": "warn"
    }
  }
];
