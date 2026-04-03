const {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getBearerToken,
  getClientPrincipal,
} = require('../../api/_shared/auth');

describe('auth helpers', () => {
  test('hash/verify password', () => {
    const pw = 's3cret!';
    const stored = hashPassword(pw);
    expect(typeof stored).toBe('string');
    expect(verifyPassword(pw, stored)).toBe(true);
    expect(verifyPassword('wrong', stored)).toBe(false);
  });

  test('sign and verify token', () => {
    const secret = 'shh';
    const token = signToken({ foo: 'bar' }, secret, 2); // short ttl
    const payload = verifyToken(token, secret);
    expect(payload).toBeTruthy();
    expect(payload.foo).toBe('bar');
  });

  test('verifyToken returns null for invalid tokens', () => {
    expect(verifyToken('bad.token.parts', 'x')).toBeNull();
  });

  test('getBearerToken extracts token', () => {
    expect(getBearerToken({ headers: { authorization: 'Bearer abc' } })).toBe('abc');
    expect(getBearerToken({ headers: { Authorization: 'Bearer xyz' } })).toBe('xyz');
    expect(getBearerToken({ headers: {} })).toBeNull();
  });

  test('getClientPrincipal decodes header', () => {
    const obj = { userDetails: 'me@example.com', userId: 'u1', userRoles: ['admin'] };
    const enc = Buffer.from(JSON.stringify(obj)).toString('base64');
    const principal = getClientPrincipal({ headers: { 'x-ms-client-principal': enc } });
    expect(principal).toBeTruthy();
    expect(principal.email).toBe('me@example.com');
  });
});
