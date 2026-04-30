const { Client } = require('../../api/db');

describe('Client.queryWithRetry', () => {
  test('retries on transient error then succeeds', async () => {
    const c = new Client({ connectionString: 'conn' });
    // override query to simulate transient failure then success
    c.query = vi
      .fn()
      .mockRejectedValueOnce(new Error('deadlock detected'))
      .mockResolvedValue({ rows: [{ id: 1 }] });

    const res = await c.queryWithRetry('SELECT 1', [], { maxAttempts: 2, baseDelayMs: 1 });
    expect(res).toBeDefined();
    expect(res.rows[0].id).toBe(1);
    expect(c.query).toHaveBeenCalledTimes(2);
  });

  test('does not retry on non-transient error', async () => {
    const c = new Client({ connectionString: 'conn' });
    c.query = vi.fn().mockRejectedValue(new Error('syntax error at or near'));

    await expect(
      c.queryWithRetry('SELECT', [], { maxAttempts: 2, baseDelayMs: 1 })
    ).rejects.toThrow(/syntax error/i);
    expect(c.query).toHaveBeenCalledTimes(1);
  });
});
const path = require('path');
// Sentinel connection string used by virtual mssql mock implementations
const conn = 'conn';

// Provide a stable top-level virtual mock for 'mssql'. Individual tests
// can override the mocks by calling `vi.resetModules()` and replacing
// implementations on the mocked export.
vi.mock(
  'mssql',
  () => ({
    ConnectionPool: vi.fn().mockImplementation(function () {
      this._conn = conn;
      this.connect = vi.fn().mockResolvedValue(undefined);
      this.request = vi.fn().mockReturnValue({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({ recordset: [] }),
      });
      this.close = vi.fn().mockResolvedValue(undefined);
    }),
    Transaction: vi.fn().mockImplementation(function (pool) {
      this._pool = pool;
      this.begin = vi.fn().mockResolvedValue(undefined);
      this.commit = vi.fn().mockResolvedValue(undefined);
      this.rollback = vi.fn().mockResolvedValue(undefined);
    }),
    Request: vi.fn().mockImplementation(function (target) {
      this.target = target;
      this.input = vi.fn().mockReturnThis();
      this.query = vi.fn().mockResolvedValue({ recordset: [] });
    }),
  }),
  { virtual: true }
);

describe('api/db.js Client', () => {
  beforeEach(() => {
    delete process.env.AZURE_DATABASE_URL;
    // clear any injected mssql mock between tests
    const db = require(path.join(__dirname, '../../api/db.js'));
    if (db && typeof db.__setMssqlMock === 'function') db.__setMssqlMock(undefined);
  });

  test('connect throws when no connection string provided', async () => {
    const { Client } = require(path.join(__dirname, '../../api/db.js'));
    const c = new Client();
    await expect(c.connect()).rejects.toThrow(
      'Azure SQL connection string not provided. Set AZURE_DATABASE_URL or pass connectionString option.'
    );
  });

  test('connect uses provided connection string and trims quotes', async () => {
    const mockConnect = vi.fn(() => Promise.resolve());
    const mockPoolInstance = {
      connect: mockConnect,
      request: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    };
    const mockPoolConstructor = vi.fn(function () {
      this._conn = conn;
      return mockPoolInstance;
    });

    const db = require(path.join(__dirname, '../../api/db.js'));
    db.__setMssqlMock({ ConnectionPool: mockPoolConstructor });
    const { Client, sql } = db;

    expect(sql).toBeDefined();

    process.env.AZURE_DATABASE_URL = '"my-conn-string"';
    const c = new Client();
    await c.connect();

    expect(mockPoolConstructor).toHaveBeenCalled();
    // ensure the quotes were trimmed when passed to ConnectionPool
    expect(mockPoolConstructor.mock.calls[0][0]).toBe('my-conn-string');
  });

  test('begin/commit/rollback transaction flows and errors', async () => {
    const mockBegin = vi.fn(() => Promise.resolve());
    const mockCommit = vi.fn(() => Promise.resolve());
    const mockRollback = vi.fn(() => Promise.resolve());

    const mockTransactionConstructor = vi.fn(function (pool) {
      this._pool = pool;
      this.begin = mockBegin;
      this.commit = mockCommit;
      this.rollback = mockRollback;
    });

    const mockConnect = vi.fn(() => Promise.resolve());
    const mockPoolInstance = {
      connect: mockConnect,
      request: vi.fn(),
      close: vi.fn(() => Promise.resolve()),
    };
    const mockPoolConstructor = vi.fn(function () {
      return mockPoolInstance;
    });

    const mockRequestInstance = {
      input: vi.fn(),
      query: vi.fn(() => Promise.resolve({ recordset: [] })),
    };
    const mockRequestConstructor = vi.fn(function (tx) {
      // if tx passed in, we can inspect it in tests
      this._tx = tx;
      return mockRequestInstance;
    });

    const db = require(path.join(__dirname, '../../api/db.js'));
    db.__setMssqlMock({
      ConnectionPool: mockPoolConstructor,
      Transaction: mockTransactionConstructor,
      Request: mockRequestConstructor,
    });
    const { Client } = db;
    process.env.AZURE_DATABASE_URL = 'conn';
    const c = new Client();
    await c.connect();

    // beginTransaction when connected
    await c.beginTransaction();
    expect(mockTransactionConstructor).toHaveBeenCalledWith(mockPoolInstance);
    expect(mockBegin).toHaveBeenCalled();

    // commitTransaction works and clears transaction
    await c.commitTransaction();
    expect(mockCommit).toHaveBeenCalled();
    await expect(c.commitTransaction()).rejects.toThrow('No active transaction');

    // begin again and test rollback clears even if rollback rejects
    await c.beginTransaction();
    mockRollback.mockImplementationOnce(() => Promise.reject(new Error('rollback-err')));
    await expect(c.rollbackTransaction()).rejects.toThrow('rollback-err');
    // after rollback (even failed) transaction must be cleared
    await expect(c.commitTransaction()).rejects.toThrow('No active transaction');
  });

  test('query throws when not connected and transforms params and placeholders', async () => {
    const { Client } = require(path.join(__dirname, '../../api/db.js'));
    const c = new Client({ connectionString: 'x' });
    // not connected yet
    await expect(c.query('select $1')).rejects.toThrow('Client not connected');

    // now mock mssql with pool and request
    const mockQuery = vi.fn(() => Promise.resolve({ recordset: [{ id: 1 }] }));
    const mockRequestInstance = { input: vi.fn(), query: mockQuery };
    const mockRequestConstructor = vi.fn(function (tx) {
      this._tx = tx;
      return mockRequestInstance;
    });
    const mockPoolInstance = {
      connect: vi.fn(() => Promise.resolve()),
      request: vi.fn(() => mockRequestInstance),
      close: vi.fn(() => Promise.resolve()),
    };
    const mockPoolConstructor = vi.fn(function () {
      return mockPoolInstance;
    });

    const db = require(path.join(__dirname, '../../api/db.js'));
    db.__setMssqlMock({ ConnectionPool: mockPoolConstructor, Request: mockRequestConstructor });

    // recreate client to pick up mocked mssql
    const c2 = new db.Client({ connectionString: 'y' });
    await c2.connect();

    // test params: object that stringifies, circular object that fails JSON.stringify,
    // Buffer and Date should be passed through
    const goodObj = { a: 1 };
    const circ = {};
    circ.self = circ;
    const buf = Buffer.from('ok');
    const dt = new Date('2020-01-01');

    const res = await c2.query('select $1, $2, $3, $4', [goodObj, circ, buf, dt]);
    // placeholders should be transformed to @p1 etc and query called once
    expect(mockQuery).toHaveBeenCalled();
    // input should be called 4 times
    expect(mockRequestInstance.input).toHaveBeenCalledTimes(4);
    // first param should be JSON string of goodObj
    expect(mockRequestInstance.input.mock.calls[0][1]).toBe(JSON.stringify(goodObj));
    // second param (circular) should have fallen back to String(circ)
    expect(mockRequestInstance.input.mock.calls[1][1]).toBe(String(circ));
    // buffer preserved
    expect(mockRequestInstance.input.mock.calls[2][1]).toBe(buf);
    // date preserved
    expect(mockRequestInstance.input.mock.calls[3][1]).toBe(dt);
    expect(res.rows).toEqual([{ id: 1 }]);
  });

  test('end closes pool and handles close errors gracefully', async () => {
    const mockClose = vi.fn(() => Promise.resolve());
    const mockPoolInstance = {
      connect: vi.fn(() => Promise.resolve()),
      request: vi.fn(),
      close: mockClose,
    };
    const mockPoolConstructor = vi.fn(function () {
      return mockPoolInstance;
    });

    const db = require(path.join(__dirname, '../../api/db.js'));
    db.__setMssqlMock({ ConnectionPool: mockPoolConstructor });
    const { Client } = db;
    process.env.AZURE_DATABASE_URL = 'conn';
    const c = new Client();
    await c.connect();
    await c.end();
    expect(mockClose).toHaveBeenCalled();

    // now simulate close throwing - should be ignored
    const mockCloseFail = vi.fn(() => Promise.reject(new Error('close-err')));
    const mockPoolInstance2 = {
      connect: vi.fn(() => Promise.resolve()),
      request: vi.fn(),
      close: mockCloseFail,
    };
    const mockPoolConstructor2 = vi.fn(function () {
      return mockPoolInstance2;
    });
    const db2 = require(path.join(__dirname, '../../api/db.js'));
    db2.__setMssqlMock({ ConnectionPool: mockPoolConstructor2 });
    process.env.AZURE_DATABASE_URL = 'c2';
    const c2 = new db2.Client();
    await c2.connect();
    // should not throw
    await expect(c2.end()).resolves.toBeUndefined();
  });

  test('sql getter returns injected mock', () => {
    const db = require(path.join(__dirname, '../../api/db.js'));
    const sentinel = { ConnectionPool: true };
    db.__setMssqlMock(sentinel);
    expect(db.sql).toBe(sentinel);
    db.__setMssqlMock(undefined);
  });
});
