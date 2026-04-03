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
