/**
 * @fileoverview Lightweight DB client wrapper used by the API functions.
 * @module api/db.js
 */

// Require `mssql` lazily inside methods so tests can mock the module before it's loaded.
// Testing hook: tests may inject a fake mssql implementation via
// `require('./db').__setMssqlMock(mock)`. This avoids brittle jest mocking.
let __mssqlMock = undefined;
// Testing hook: tests may inject a constructed client instance directly
// via `require('./db').__setTestClient(client)` so that `new Client()`
// returns the provided test client. This is useful for unit tests that
// need to assert on query calls.
let __testClient = null;
// During test runs, provide a default no-op fake mssql implementation so
// tests that don't explicitly mock the DB client won't attempt real
// network connections. Individual tests may still override this with
// `__setMssqlMock` if they need custom behavior.
if (process.env.NODE_ENV === 'test') {
  __mssqlMock = {
    ConnectionPool: class {
      constructor() {}
      async connect() {
        return undefined;
      }
      request() {
        return new (class {
          constructor() {
            this._inputs = {};
          }
          input(name, _val) {
            this._inputs[name] = true;
          }
          async query() {
            return { recordset: [] };
          }
        })();
      }
      async close() {
        return undefined;
      }
    },
    Transaction: class {
      constructor() {}
      async begin() {
        return undefined;
      }
      async commit() {
        return undefined;
      }
      async rollback() {
        return undefined;
      }
    },
    Request: class {
      constructor() {
        this._inputs = {};
      }
      input(name, _val) {
        this._inputs[name] = true;
      }
      async query() {
        return { recordset: [] };
      }
    },
  };
}
function __getMssql() {
  if (__mssqlMock) return __mssqlMock;
  return require('mssql');
}

class Client {
  constructor(options) {
    if (__testClient) return __testClient;
    this._connectionString = (options && options.connectionString) || null;
    this._pool = null;
  }

  async connect() {
    // Prefer explicit option, then AZURE_DATABASE_URL. Use the string as-is
    // (trim surrounding quotes) — we only support Azure SQL connection strings.
    const raw = this._connectionString || process.env.AZURE_DATABASE_URL || '';
    let connStr = String(raw || '').trim();
    if (
      (connStr.startsWith('"') && connStr.endsWith('"')) ||
      (connStr.startsWith("'") && connStr.endsWith("'"))
    ) {
      connStr = connStr.slice(1, -1);
    }

    if (!connStr) {
      throw new Error(
        'Azure SQL connection string not provided. Set AZURE_DATABASE_URL or pass connectionString option.'
      );
    }

    const sql = __getMssql();
    this._pool = new sql.ConnectionPool(String(connStr));
    await this._pool.connect();
  }

  async beginTransaction() {
    if (!this._pool) throw new Error('Client not connected');
    const sql = __getMssql();
    this._transaction = new sql.Transaction(this._pool);
    await this._transaction.begin();
  }

  async commitTransaction() {
    if (!this._transaction) throw new Error('No active transaction');
    await this._transaction.commit();
    this._transaction = null;
  }

  async rollbackTransaction() {
    if (!this._transaction) return;
    try {
      await this._transaction.rollback();
    } finally {
      this._transaction = null;
    }
  }

  async query(text, params) {
    if (!this._pool) throw new Error('Client not connected');
    // Convert Postgres-style $1/$2 placeholders to T-SQL @p1/@p2 to match
    // how we bind parameters below (we call `req.input('p1', value)`).
    const transformedText = String(text).replace(/\$(\d+)/g, '@p$1');
    const sql = __getMssql();
    const req = this._transaction ? new sql.Request(this._transaction) : this._pool.request();
    const values = Array.isArray(params) ? params : [];

    for (let i = 0; i < values.length; i++) {
      let v = values[i];
      if (
        v !== null &&
        v !== undefined &&
        typeof v === 'object' &&
        !(v instanceof Buffer) &&
        !(v instanceof Date)
      ) {
        try {
          v = JSON.stringify(v);
        } catch {
          v = String(v);
        }
      }
      req.input('p' + (i + 1), v);
    }
    const res = await req.query(transformedText);
    return { rows: res.recordset || [] };
  }

  // Helper: query with retry/backoff for transient DB errors.
  // Options: { maxAttempts, baseDelayMs }
  async queryWithRetry(text, params, options) {
    const maxAttempts = (options && options.maxAttempts) || 3;
    const baseDelay = (options && options.baseDelayMs) || 200;
    const isTransient = (err) => {
      if (!err) return false;
      const msg = String(err.message || '').toLowerCase();
      return (
        msg.includes('deadlock') ||
        msg.includes('timeout') ||
        msg.includes('connection') ||
        msg.includes('transient') ||
        msg.includes('could not serialize')
      );
    };
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.query(text, params);
      } catch (err) {
        if (attempt === maxAttempts || !isTransient(err)) throw err;
        const backoff = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
  }

  async end() {
    try {
      if (this._pool) {
        await this._pool.close();
        this._pool = null;
      }
    } catch {
      // ignore
    }
  }
}

module.exports = {
  Client,
  __setMssqlMock(m) {
    __mssqlMock = m;
  },
  __setTestClient(c) {
    __testClient = c;
  },
  get sql() {
    try {
      return __getMssql();
    } catch {
      return undefined;
    }
  },
  // NOTE: `createClient` and `runQueryWithRetry` removed. Callers should
  // construct `new Client({...})` and call `client.queryWithRetry(...)`.
};
