/**
 * @fileoverview Tests for warmup endpoint.
 * @module tests/api/warmup.test.js
 */

const warmupHandler = require('../../api/warmup/index');

describe('warmup endpoint', () => {
  test('returns 200 and ok=true', async () => {
    const context = {
      req: {},
      res: null,
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    };
    await warmupHandler(context);
    expect(context.res).toBeDefined();
    expect(context.res.status).toBe(200);
    expect(context.res.body).toBeDefined();
    expect(context.res.body.ok).toBe(true);
    expect(typeof context.res.body.warmedAt).toBe('string');
  });
});
