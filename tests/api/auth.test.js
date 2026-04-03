/**
 * @fileoverview Tests for auth API endpoints.
 * @module tests/api/auth.test.js
 */

jest.mock('../../api/_shared/auth', () => {
  const actual = jest.requireActual('../../api/_shared/auth');
  return { ...actual, getClientPrincipal: jest.fn() };
});
const { getClientPrincipal } = require('../../api/_shared/auth');

const authHandler = require('../../api/auth/index');

function buildContext() {
  return {
    log: {
      error: jest.fn(),
    },
    res: null,
  };
}

describe('auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when principal is missing', async () => {
    getClientPrincipal.mockReturnValue(null);

    const context = buildContext();
    await authHandler(context, {
      method: 'GET',
      params: { action: 'me' },
      headers: {},
    });

    expect(context.res.status).toBe(401);
    expect(context.res.body).toEqual({ error: 'Unauthorized' });
  });

  test('returns principal details when authenticated', async () => {
    getClientPrincipal.mockReturnValue({
      userId: 'test-user',
      email: 'dev@lodovi.co',
      name: 'Dev User',
      identityProvider: 'aad',
    });

    const context = buildContext();
    await authHandler(context, {
      method: 'GET',
      params: { action: 'me' },
      headers: {},
    });

    expect(context.res.status).toBe(200);
    expect(context.res.body).toEqual({
      user: {
        id: 'test-user',
        email: 'dev@lodovi.co',
        fullName: 'Dev User',
        provider: 'aad',
      },
    });
  });
});

// Consolidated shared auth helper tests (use actual implementations)
const actualAuth = jest.requireActual('../../api/_shared/auth');

describe('auth helpers', () => {
  test('hash/verify password', () => {
    const pw = 's3cret!';
    const stored = actualAuth.hashPassword(pw);
    expect(typeof stored).toBe('string');
    expect(actualAuth.verifyPassword(pw, stored)).toBe(true);
    expect(actualAuth.verifyPassword('wrong', stored)).toBe(false);
  });

  test('sign and verify token', () => {
    const secret = 'shh';
    const token = actualAuth.signToken({ foo: 'bar' }, secret, 2);
    const payload = actualAuth.verifyToken(token, secret);
    expect(payload).toBeTruthy();
    expect(payload.foo).toBe('bar');
  });

  test('verifyToken returns null for invalid tokens', () => {
    expect(actualAuth.verifyToken('bad.token.parts', 'x')).toBeNull();
  });

  test('getBearerToken extracts token', () => {
    expect(actualAuth.getBearerToken({ headers: { authorization: 'Bearer abc' } })).toBe('abc');
    expect(actualAuth.getBearerToken({ headers: { Authorization: 'Bearer xyz' } })).toBe('xyz');
    expect(actualAuth.getBearerToken({ headers: {} })).toBeNull();
  });

  test('getClientPrincipal decodes header', () => {
    const obj = { userDetails: 'me@example.com', userId: 'u1', userRoles: ['admin'] };
    const enc = Buffer.from(JSON.stringify(obj)).toString('base64');
    const principal = actualAuth.getClientPrincipal({ headers: { 'x-ms-client-principal': enc } });
    expect(principal).toBeTruthy();
    expect(principal.email).toBe('me@example.com');
  });
});

// Observability helpers tests (beginRequest, endRequest, failRequest, withRequestId)
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../../api/_shared/observability');

describe('observability helpers', () => {
  test('beginRequest writes start event using context.log.info', () => {
    const log = { info: jest.fn() };
    const context = { log };
    const req = { method: 'post', url: '/admin', headers: { 'x-request-id': 'rid-123' } };
    const meta = beginRequest(context, req, 'op.test');
    expect(meta.requestId).toBe('rid-123');
    expect(meta.operationName).toBe('op.test');
    expect(log.info).toHaveBeenCalled();
    const msg = log.info.mock.calls[0][0];
    expect(msg).toMatch(/request.start/);
    expect(msg).toMatch(/op.test/);
  });

  test('endRequest writes end event and includes statusCode', () => {
    const log = { info: jest.fn() };
    const context = { log };
    const meta = {
      requestId: 'x',
      startedAt: Date.now() - 5,
      method: 'GET',
      path: '/x',
      operationName: 'o',
    };
    endRequest(context, meta, 200, { extra: 'v' });
    expect(log.info).toHaveBeenCalled();
    const msg = log.info.mock.calls[0][0];
    expect(msg).toMatch(/request.end/);
    expect(msg).toMatch(/"statusCode":200/);
    expect(msg).toMatch(/"extra":"v"/);
  });

  test('failRequest writes error event using context.log.error', () => {
    const log = { error: jest.fn() };
    const context = { log };
    const meta = {
      requestId: 'e',
      startedAt: Date.now() - 10,
      method: 'POST',
      path: '/err',
      operationName: 'errOp',
    };
    failRequest(context, meta, new Error('boom'), 500);
    expect(log.error).toHaveBeenCalled();
    const msg = log.error.mock.calls[0][0];
    expect(msg).toMatch(/request.error/);
    expect(msg).toMatch(/boom/);
  });

  test('withRequestId merges headers and sets x-request-id', () => {
    const hdrs = { 'content-type': 'application/json' };
    const out = withRequestId(hdrs, 'r1');
    expect(out['x-request-id']).toBe('r1');
    expect(out['content-type']).toBe('application/json');
  });
});
