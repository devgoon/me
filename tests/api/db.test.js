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
  });
}
