const sql = require('mssql');


class Client {
  constructor(options) {
    this._connectionString = (options && options.connectionString) || null;
    this._pool = null;
  }

  async connect() {
    // Prefer an explicit option, then DATABASE_URL.
    const raw = this._connectionString || process.env.DATABASE_URL || '';
    let connStr = '';
    if (raw !== null && raw !== undefined) {
      connStr = String(raw).trim();
      // tolerate surrounding single or double quotes from .env files
      if ((connStr.startsWith('"') && connStr.endsWith('"')) || (connStr.startsWith("'") && connStr.endsWith("'"))) {
        connStr = connStr.slice(1, -1);
      }
      // Support DATABASE_URL values emitted by some tools, e.g.:
      // sqlserver://host:1433;database=NAME;user=USER;password=PW;encrypt=true;...
      if (/^\s*sqlserver:\/\//i.test(connStr)) {
        // split on semicolons
        const parts = connStr.split(/;/).map((s) => s.trim()).filter(Boolean);
        const first = parts.shift(); // sqlserver://host:port
        const hostPort = first.replace(/^sqlserver:\/\//i, '');
        let host = hostPort;
        let port = '';
        if (hostPort.includes(':')) {
          const idx = hostPort.lastIndexOf(':');
          host = hostPort.slice(0, idx);
          port = hostPort.slice(idx + 1);
        }
        const kv = {};
        parts.forEach((p) => {
          const m = p.match(/^([^=]+)=(.*)$/);
          if (m) kv[m[1].toLowerCase()] = m[2];
        });
        const dataSource = port ? `${host},${port}` : host;
        const initialCatalog = kv.database || kv.db || '';
        const user = kv.user || kv.username || kv.uid || kv.u || '';
        const password = kv.password || kv.pw || kv.pass || '';
        const encrypt = kv.encrypt || '';
        // Build a driver-friendly connection string
        let built = `Data Source=${dataSource};`;
        if (initialCatalog) built += `Initial Catalog=${initialCatalog};`;
        if (user) built += `User ID=${user};`;
        if (password) built += `Password=${password};`;
        if (encrypt) built += `Encrypt=${encrypt};`;
        connStr = built;
      }
    }
    if (!connStr) {
      throw new Error('Azure SQL connection string not provided. Set DATABASE_URL or pass connectionString option.');
    }
    this._pool = new sql.ConnectionPool(String(connStr));
    await this._pool.connect();
  }

  async beginTransaction() {
    if (!this._pool) throw new Error('Client not connected');
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
    const req = this._transaction ? new sql.Request(this._transaction) : this._pool.request();
    const values = Array.isArray(params) ? params : [];

    try {
      const types = values.map((v, i) => ({ i: i + 1, type: v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v, sample: (v && typeof v === 'string' ? (v.length > 100 ? v.slice(0, 100) + '...' : v) : v) }));
      console.log('[DB.query] SQL:', transformedText.replace(/\s+/g, ' '));
      console.log('[DB.query] params:', JSON.stringify(types));
    } catch (e) {
      // noop
    }

    for (let i = 0; i < values.length; i++) {
      let v = values[i];
      if (v !== null && v !== undefined && typeof v === 'object' && !(v instanceof Buffer) && !(v instanceof Date)) {
        try {
          v = JSON.stringify(v);
        } catch (e) {
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
    } catch (e) {
      // ignore
    }
  }
}

module.exports = { Client, sql };
