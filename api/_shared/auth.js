/**
 * @module api/_shared/auth.js
 */

const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

/**
 * Base64-url encode a string (remove padding and make URL-safe).
 *
 * @param {string} input - Input string to encode.
 * @returns {string} URL-safe base64-encoded string.
 */
function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decode a base64-url encoded string back to UTF-8.
 *
 * @param {string} input - URL-safe base64 string.
 * @returns {string} Decoded UTF-8 string.
 */
function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  return Buffer.from(padded, 'base64').toString('utf8');
}

/**
 * Hash a password using scrypt with a random salt.
 * Returns a string of the form "salt:hash".
 *
 * @param {string} password - Plaintext password.
 * @returns {string} Salt and hash concatenated with ':'.
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext password against a stored "salt:hash" value.
 * Uses timing-safe comparison to avoid leaking information.
 *
 * @param {string} password - Plaintext password to verify.
 * @param {string} storedHash - Stored salt and hash in format produced by `hashPassword`.
 * @returns {boolean} True when password matches.
 */
function verifyPassword(password, storedHash) {
  const parts = String(storedHash || '').split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [salt, hash] = parts;
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  const left = Buffer.from(hash, 'hex');
  const right = Buffer.from(computed, 'hex');
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

/**
 * Sign a simple JWT-like token using HMAC-SHA256. The returned token is
 * composed of three dot-separated base64url parts: header.payload.signature.
 *
 * @param {Object} payload - Object payload to include in the token body.
 * @param {string} secret - Secret used for HMAC signing.
 * @param {number} [ttlSeconds=TOKEN_TTL_SECONDS] - Time-to-live in seconds.
 * @returns {string} Signed token string.
 */
function signToken(payload, secret, ttlSeconds = TOKEN_TTL_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

/**
 * Verify a token previously created by `signToken` and return the decoded
 * payload when valid and not expired. Returns null for invalid tokens.
 *
 * @param {string} token - Token string to verify.
 * @param {string} secret - Secret used to verify HMAC signature.
 * @returns {Object|null} Decoded payload or null when invalid/expired.
 */
function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedBody));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    return null;
  }

  return payload;
}

/**
 * Extract a Bearer token from an Express-like request headers object.
 *
 * @param {Object} req - Request-like object with `headers` property.
 * @returns {string|null} Bearer token string or null when not present.
 */
function getBearerToken(req) {
  const headers = req && req.headers ? req.headers : {};
  const authHeader = headers.authorization || headers.Authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Parse platform-specific client principal header (Azure Static Web Apps)
 * or fallback to cookie `StaticWebAppsAuthCookie`. Returns a normalized
 * client principal object or null.
 *
 * @param {Object} req - Request-like object with `headers`.
 * @returns {Object|null} Normalized client principal or null.
 */
function getClientPrincipal(req) {
  const headers = req && req.headers ? req.headers : {};
  const encoded = headers['x-ms-client-principal'] || headers['X-MS-CLIENT-PRINCIPAL'];
  let decoded = null;

  if (encoded) {
    try {
      decoded = JSON.parse(Buffer.from(String(encoded), 'base64').toString('utf8'));
    } catch {
      // fall through to try cookie parsing
      decoded = null;
    }
  }

  // If platform header isn't present, try the StaticWebAppsAuthCookie from cookies
  if (!decoded) {
    const cookieHeader = headers.cookie || headers.Cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)StaticWebAppsAuthCookie=([^;]+)/);
    if (match && match[1]) {
      try {
        const raw = decodeURIComponent(match[1]);
        decoded = JSON.parse(Buffer.from(String(raw), 'base64').toString('utf8'));
      } catch {
        decoded = null;
      }
    }
  }

  if (!decoded) return null;

  const claims = Array.isArray(decoded.claims) ? decoded.claims : [];
  const findClaim = (type) => {
    const entry = claims.find(
      (claim) => String(claim.typ || '').toLowerCase() === String(type).toLowerCase()
    );
    return entry ? String(entry.val || '') : '';
  };

  const email = String(
    decoded.userDetails ||
      findClaim('preferred_username') ||
      findClaim('email') ||
      findClaim('http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ||
      ''
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  return {
    userId: String(decoded.userId || ''),
    email,
    name: String(decoded.userDetails || '').trim() || email,
    identityProvider: String(decoded.identityProvider || '')
      .trim()
      .toLowerCase(),
    roles: Array.isArray(decoded.userRoles) ? decoded.userRoles : [],
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getBearerToken,
  getClientPrincipal,
};
