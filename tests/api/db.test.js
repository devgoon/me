let canMockMssql = true;
try {
  require.resolve('mssql');
} catch (err) {
  canMockMssql = false;
}

if (!canMockMssql) {
  test('skipping db client tests because mssql is not installed', () => {
    expect(true).toBe(true);
  });
} else {
  jest.mock('mssql', () => {
    return {
      ConnectionPool: jest.fn().mockImplementation(function (conn) {
        this._conn = conn;
        this.connect = jest.fn().mockResolvedValue(undefined);
        this.request = jest.fn().mockReturnValue({
          input: jest.fn().mockReturnThis(),
          query: jest.fn().mockResolvedValue({ recordset: [] }),
        });
        this.close = jest.fn().mockResolvedValue(undefined);
      }),
      Transaction: jest.fn().mockImplementation(function (pool) {
        this._pool = pool;
        this.begin = jest.fn().mockResolvedValue(undefined);
        this.commit = jest.fn().mockResolvedValue(undefined);
        this.rollback = jest.fn().mockResolvedValue(undefined);
      }),
      Request: jest.fn().mockImplementation(function (target) {
        this.target = target;
        this.input = jest.fn().mockReturnThis();
        this.query = jest.fn().mockResolvedValue({ recordset: [] });
      }),
    };
  });

  const { Client } = require('../../api/db');

  describe('DB client wrapper', () => {
    test('connect throws when no connection string', async () => {
      const c = new Client();
      await expect(c.connect()).rejects.toThrow(/Azure SQL connection string not provided/);
    });

    test('parses sqlserver URL and builds connection string', async () => {
      process.env.AZURE_DATABASE_URL =
        'sqlserver://host:1433;database=NAME;user=USER;password=PW;encrypt=true';
      const c = new Client({});
      await expect(c.connect()).resolves.toBeUndefined();
      await c.end();
    });

    test('connect, query, transactions, and end flow (mocked mssql)', async () => {
      process.env.AZURE_DATABASE_URL = 'Server=.;Database=Test;User Id=u;Password=p;';
      const c = new Client();
      await expect(c.connect()).resolves.toBeUndefined();
      await expect(c.query('SELECT 1')).resolves.toEqual({ rows: [] });
      await expect(c.beginTransaction()).resolves.toBeUndefined();
      await expect(c.commitTransaction()).resolves.toBeUndefined();
      // rollback when no active transaction should resolve
      await expect(c.rollbackTransaction()).resolves.toBeUndefined();
      await expect(c.end()).resolves.toBeUndefined();
    });

    test('uses provided Azure connection string as-is when connecting', async () => {
      const mssql = require('mssql');
      const azureConn =
        'Data Source=example.com,1433;Initial Catalog=MyDb;User ID=app;Password=secret;Encrypt=true';
      const c = new Client({ connectionString: azureConn });
      await expect(c.connect()).resolves.toBeUndefined();
      expect(mssql.ConnectionPool).toHaveBeenCalledTimes(1);
      const calledArg = mssql.ConnectionPool.mock.calls[0][0];
      expect(calledArg).toContain('Data Source=example.com');
      expect(calledArg).toContain('Initial Catalog=MyDb');
      expect(calledArg).toContain('User ID=app');
      expect(calledArg).toContain('Password=secret');
      expect(calledArg).toContain('Encrypt=true');
    });
  });
}
