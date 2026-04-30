// Ensure apiFetch exists during tests and delegates to the mocked fetch
if (typeof global.apiFetch === 'undefined') {
  global.apiFetch = function (url, opts) {
    return global.fetch(url, opts);
  };
}

// No-op here: `api/db.js` enables a default fake mssql when
// `process.env.NODE_ENV === 'test'`. Per-file tests can still override
// behavior by calling `require('../api/db').__setMssqlMock(...)`.
