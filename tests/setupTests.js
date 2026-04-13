// Ensure apiFetch exists during tests and delegates to the mocked fetch
if (typeof global.apiFetch === 'undefined') {
  global.apiFetch = function (url, opts, options) {
    return global.fetch(url, opts);
  };
}
