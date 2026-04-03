/**
 * @fileoverview Lightweight DB client wrapper used by the API functions.
 * @module api/db.js
 */

// Require `mssql` lazily inside methods so tests can mock the module before it's loaded.

class Client {
  constructor(options) {
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

    const sql = require('mssql');
    this._pool = new sql.ConnectionPool(String(connStr));
    await this._pool.connect();
  }

  async beginTransaction() {
    if (!this._pool) throw new Error('Client not connected');
    const sql = require('mssql');
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
    const sql = require('mssql');
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
  get sql() {
    try {
      return require('mssql');
    } catch (e) {
      return undefined;
    }
  },
};
