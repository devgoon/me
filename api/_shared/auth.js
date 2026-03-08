const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [salt, hash] = parts;
  const computed = crypto.scryptSync(password, salt, 64).toString("hex");
  const left = Buffer.from(hash, "hex");
  const right = Buffer.from(computed, "hex");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function signToken(payload, secret, ttlSeconds = TOKEN_TTL_SECONDS) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyToken(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedBody, signature] = parts;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedBody}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedBody));
  } catch (error) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) {
    return null;
  }

  return payload;
}

function getBearerToken(req) {
  const headers = req && req.headers ? req.headers : {};
  const authHeader = headers.authorization || headers.Authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function getClientPrincipal(req) {
  const headers = req && req.headers ? req.headers : {};
  const encoded = headers["x-ms-client-principal"] || headers["X-MS-CLIENT-PRINCIPAL"];
  if (!encoded) {
    return null;
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(String(encoded), "base64").toString("utf8"));
  } catch (error) {
    return null;
  }

  const claims = Array.isArray(decoded.claims) ? decoded.claims : [];
  const findClaim = (type) => {
    const entry = claims.find((claim) => String(claim.typ || "").toLowerCase() === String(type).toLowerCase());
    return entry ? String(entry.val || "") : "";
  };

  const email = String(
    decoded.userDetails ||
    findClaim("preferred_username") ||
    findClaim("email") ||
    findClaim("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress") ||
    ""
  ).trim().toLowerCase();

  if (!email) {
    return null;
  }

  return {
    userId: String(decoded.userId || ""),
    email,
    name: String(decoded.userDetails || "").trim() || email,
    identityProvider: String(decoded.identityProvider || "").trim().toLowerCase(),
    roles: Array.isArray(decoded.userRoles) ? decoded.userRoles : []
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  getBearerToken,
  getClientPrincipal
};
