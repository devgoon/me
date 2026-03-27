const sql = require('mssql');


class Client {
  constructor(options) {
    this._connectionString = (options && options.connectionString) || process.env.DATABASE_URL || null;
    this._pool = null;
  }

  async connect() {
    if (!this._connectionString) throw new Error('DATABASE_URL is not configured');
    let cs = this._connectionString;
    // Support connection strings that start with the sqlserver:// prefix
    if (/^sqlserver:\/\//i.test(cs)) {
      cs = cs.replace(/^sqlserver:\/\//i, '');
    }

    // Build a mssql config object from many possible connection string formats:
    // - full URI: mssql://user:pass@host:port/db?encrypt=true
    // - sqlserver://...
    // - host:port;database=...;user=...;password=...
    // - key=value;key2=value2; DSN
    function buildConfig(orig) {
      if (!orig || typeof orig !== 'string') return orig;
      const s = orig.trim();

      // Try URI parsing if it looks like a URI or contains an @ and / (user@host/db)
      const looksLikeUri = /^[a-z0-9+.-]+:\/\//i.test(s) || (/@/.test(s) && /\/.+/.test(s));
      if (looksLikeUri) {
        try {
          const raw = /^[a-z0-9+.-]+:\/\//i.test(s) ? s : `mssql://${s}`;
          const u = new URL(raw);
          const host = u.hostname;
          const port = u.port ? Number(u.port) : undefined;
          const user = u.username || undefined;
          const password = u.password || undefined;
          const database = (u.pathname || '').replace(/^\//, '') || undefined;
          const opts = {};
          for (const [k, v] of u.searchParams.entries()) {
            opts[k.toLowerCase()] = v;
          }
          const config = {
            server: host || undefined,
            options: {
              encrypt: (opts.encrypt || '').toLowerCase() === 'true',
              trustServerCertificate: (opts.trustservercertificate || '').toLowerCase() === 'true'
            }
          };
          // Default to encrypt=true for Azure SQL when not explicitly set
          if (config.options.encrypt !== true && config.options.encrypt !== false) {
            config.options.encrypt = true;
          }
          if (port) config.port = port;
          if (user) config.user = user;
          if (password) config.password = password;
          if (database) config.database = database;
          return config;
        } catch (e) {
          // fall through
        }
      }

      // Otherwise, if it looks like key=value;... parse into kv map
      if (/=/.test(s)) {
        const parts = s.split(';').map(p => p.trim()).filter(Boolean);
        const kv = {};
        for (const part of parts) {
          const eq = part.indexOf('=');
          if (eq === -1) continue;
          const k = part.slice(0, eq).trim();
          const v = part.slice(eq + 1).trim();
          kv[k.toLowerCase()] = v;
        }

        // server may be in 'server', 'data source', or in 'server=tcp:host,1433'
        let serverRaw = kv['server'] || kv['data source'] || '';
        if (!serverRaw && kv['data-source']) serverRaw = kv['data-source'];
        if (serverRaw && serverRaw.toLowerCase().startsWith('tcp:')) serverRaw = serverRaw.slice(4);

        let server = serverRaw;
        let port = undefined;
        if (serverRaw && serverRaw.indexOf(',') !== -1) {
          const [h, p] = serverRaw.split(',');
          server = h.trim();
          port = Number(p.trim()) || undefined;
        }

        const config = {
          server: server || undefined,
          options: {
            encrypt: (kv['encrypt'] || '').toLowerCase() === 'true',
            trustServerCertificate: (kv['trustservercertificate'] || '').toLowerCase() === 'true'
          }
        };
        // Default to encrypt=true for Azure SQL when not explicitly set
        if (config.options.encrypt !== true && config.options.encrypt !== false) {
          config.options.encrypt = true;
        }
        if (port) config.port = port;
        if (kv['user id'] || kv['user'] || kv['uid']) config.user = kv['user id'] || kv['user'] || kv['uid'];
        if (kv['password'] || kv['pwd']) config.password = kv['password'] || kv['pwd'];
        if (kv['database'] || kv['initial catalog']) config.database = kv['database'] || kv['initial catalog'];
        if (kv['connect timeout'] || kv['logintimeout']) config.connectionTimeout = Number(kv['connect timeout'] || kv['logintimeout']) * 1000;
        return config;
      }

      // Fallback: if it looks like host:port;... pattern (e.g., host:1433;database=...)
      const hostPortMatch = s.match(/^([^;:]+):(\d+);?(.*)$/);
      if (hostPortMatch) {
        const host = hostPortMatch[1];
        const port = Number(hostPortMatch[2]);
        const rest = hostPortMatch[3] || '';
        const kv = { server: `${host},${port}` };
        if (rest) {
          const parts = rest.split(';').map(p => p.trim()).filter(Boolean);
          for (const part of parts) {
            const eq = part.indexOf('=');
            if (eq === -1) continue;
            const k = part.slice(0, eq).trim();
            const v = part.slice(eq + 1).trim();
            kv[k.toLowerCase()] = v;
          }
        }
        const config = {
          server: host,
          port: port,
          options: { encrypt: (kv['encrypt'] || '').toLowerCase() === 'true' }
        };
        // Default to encrypt=true for Azure SQL when not explicitly set
        if (config.options.encrypt !== true && config.options.encrypt !== false) {
          config.options.encrypt = true;
        }
        if (kv['user'] || kv['user id']) config.user = kv['user'] || kv['user id'];
        if (kv['password'] || kv['pwd']) config.password = kv['password'] || kv['pwd'];
        if (kv['database'] || kv['initial catalog']) config.database = kv['database'] || kv['initial catalog'];
        return config;
      }

      return orig;
    }

    // If explicit AZURE_SQL_* env vars are provided, prefer them over DATABASE_URL
    const azureServer = process.env.AZURE_SQL_SERVER;
    if (azureServer) {
      const cfg = {
        server: azureServer,
        options: {
          encrypt: true,
          trustServerCertificate: true
        }
      };
      if (process.env.AZURE_SQL_PORT) cfg.port = Number(process.env.AZURE_SQL_PORT);
      if (process.env.AZURE_SQL_DATABASE) cfg.database = process.env.AZURE_SQL_DATABASE;
      if (process.env.AZURE_SQL_USER) cfg.user = process.env.AZURE_SQL_USER;
      if (process.env.AZURE_SQL_PASSWORD) cfg.password = process.env.AZURE_SQL_PASSWORD;
      // Note: advanced AAD authentication types are not configured here;
      // if using managed identity/AAD, ensure local dev auth is handled separately.
      this._pool = new sql.ConnectionPool(cfg);
      await this._pool.connect();
      return;
    }

    const built = buildConfig(cs);
    if (built && typeof built === 'object' && !Array.isArray(built)) {
      this._pool = new sql.ConnectionPool(built);
    } else {
      // fallback to passing connection string
      this._pool = new sql.ConnectionPool(String(built || cs));
    }
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
