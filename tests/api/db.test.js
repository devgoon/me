// Force-mock 'mssql' so tests run even if the real package isn't installed.
jest.mock(
  'mssql',
  () => ({
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
  }),
  { virtual: true }
);

const { Client } = require('../../api/db');

describe('DB client wrapper', () => {
  test('connect throws when no connection string', async () => {
    const c = new Client();
    await expect(c.connect()).rejects.toThrow(/Azure SQL connection string not provided/);
  });

  test('connect and basic operations with mocked mssql', async () => {
    process.env.AZURE_DATABASE_URL = 'Server=.;Database=Test;User Id=u;Password=p;';
    const c = new Client();
    await expect(c.connect()).resolves.toBeUndefined();
    await expect(c.query('SELECT 1')).resolves.toEqual({ rows: [] });
    // begin/commit/rollback should be callable (no-op in our mock)
    await expect(c.beginTransaction()).resolves.toBeUndefined();
    await expect(c.commitTransaction()).resolves.toBeUndefined();
    await expect(c.rollbackTransaction()).resolves.toBeUndefined();
    await expect(c.end()).resolves.toBeUndefined();
  });

  test('uses provided Azure connection string as-is when connecting', async () => {
    const mssql = require('mssql');
    const azureConn =
      'Data Source=example.com,1433;Initial Catalog=MyDb;User ID=app;Password=secret;Encrypt=true';
    const c = new Client({ connectionString: azureConn });
    await expect(c.connect()).resolves.toBeUndefined();
    expect(mssql.ConnectionPool).toHaveBeenCalled();
    const calls = mssql.ConnectionPool.mock.calls;
    const calledArg = calls[calls.length - 1][0];
    expect(calledArg).toContain('Data Source=example.com');
    expect(calledArg).toContain('Initial Catalog=MyDb');
    expect(calledArg).toContain('User ID=app');
    expect(calledArg).toContain('Password=secret');
    expect(calledArg).toContain('Encrypt=true');
  });
});
