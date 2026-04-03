// Force-mock mssql to exercise api/db.js even when mssql isn't installed
jest.resetModules();
try {
  require.resolve('mssql');
  jest.mock('mssql', () => ({
    ConnectionPool: jest.fn().mockImplementation(function (conn) {
      this._conn = conn;
      this.connect = jest.fn().mockResolvedValue(undefined);
      this.request = jest.fn().mockReturnValue({
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [{ a: 1 }] }),
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
      this.query = jest.fn().mockResolvedValue({ recordset: [{ a: 1 }] });
    }),
  }));
} catch (err) {
  jest.mock(
    'mssql',
    () => ({
      ConnectionPool: jest.fn().mockImplementation(function (conn) {
        this._conn = conn;
        this.connect = jest.fn().mockResolvedValue(undefined);
        this.request = jest.fn().mockReturnValue({
          input: jest.fn().mockReturnThis(),
          query: jest.fn().mockResolvedValue({ recordset: [{ a: 1 }] }),
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
        this.query = jest.fn().mockResolvedValue({ recordset: [{ a: 1 }] });
      }),
    }),
    { virtual: true }
  );
}

const { Client } = require('../../api/db');

describe('DB client wrapper (mocked mssql)', () => {
  test('connect, query, transactions, and end flow', async () => {
    process.env.AZURE_DATABASE_URL = 'Server=.;Database=Test;User Id=u;Password=p;';
    const c = new Client();
    await expect(c.connect()).resolves.toBeUndefined();
    await expect(c.query('SELECT 1')).resolves.toEqual({ rows: [{ a: 1 }] });
    await expect(c.beginTransaction()).resolves.toBeUndefined();
    await expect(c.commitTransaction()).resolves.toBeUndefined();
    // test rollback when no active transaction: should not throw
    await expect(c.rollbackTransaction()).resolves.toBeUndefined();
    await expect(c.end()).resolves.toBeUndefined();
  });
});
