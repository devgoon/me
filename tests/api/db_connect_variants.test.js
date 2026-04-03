// Test parsing of various connection string formats in api/db.js
jest.resetModules();
try {
  require.resolve('mssql');
  jest.mock('mssql', () => ({
    ConnectionPool: jest.fn().mockImplementation(function (conn) {
      this._conn = conn;
      this.connect = jest.fn().mockResolvedValue(undefined);
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
  }));
} catch (err) {
  jest.mock(
    'mssql',
    () => ({
      ConnectionPool: jest.fn().mockImplementation(function (conn) {
        this._conn = conn;
        this.connect = jest.fn().mockResolvedValue(undefined);
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
}

describe('DB connect string parsing', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('uses provided Azure connection string as-is when connecting', async () => {
    const { Client } = require('../../api/db');
    const azureConn =
      'Data Source=example.com,1433;Initial Catalog=MyDb;User ID=app;Password=secret;Encrypt=true';
    const c = new Client({ connectionString: azureConn });
    await expect(c.connect()).resolves.toBeUndefined();

    const mssql = require('mssql');
    expect(mssql.ConnectionPool).toHaveBeenCalledTimes(1);
    const calledArg = mssql.ConnectionPool.mock.calls[0][0];
    expect(calledArg).toContain('Data Source=example.com,1433');
    expect(calledArg).toContain('Initial Catalog=MyDb');
    expect(calledArg).toContain('User ID=app');
    expect(calledArg).toContain('Password=secret');
    expect(calledArg).toContain('Encrypt=true');
  });

  test('throws when no connection string supplied', async () => {
    const { Client } = require('../../api/db');
    const c = new Client({ connectionString: '' });
    // Ensure AZURE_DATABASE_URL is unset for this test
    const orig = process.env.AZURE_DATABASE_URL;
    delete process.env.AZURE_DATABASE_URL;
    await expect(c.connect()).rejects.toThrow('Azure SQL connection string not provided');
    if (orig !== undefined) process.env.AZURE_DATABASE_URL = orig;
  });
});
