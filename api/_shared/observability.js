/**
 * @fileoverview Observability helpers (request tracing, logging helpers).
 * @module api/_shared/observability.js
 */

const { randomUUID } = require('crypto');

function getRequestId(req) {
  const headerValue =
    req && req.headers ? req.headers['x-request-id'] || req.headers['X-Request-Id'] : null;
  const normalized = headerValue ? String(headerValue).trim() : '';
  if (normalized) {
    return normalized;
  }
  try {
    return randomUUID();
  } catch {
    return `req-${Date.now()}`;
  }
}

function beginRequest(context, req, operationName) {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  const method = String((req && req.method) || 'GET').toUpperCase();
  const path = String((req && req.url) || '');

  writeInfo(
    context,
    JSON.stringify({
      event: 'request.start',
      requestId,
      operation: operationName,
      method,
      path,
    })
  );

  return { requestId, startedAt, method, path, operationName };
}

function endRequest(context, meta, statusCode, extras) {
  const durationMs = Date.now() - meta.startedAt;
  writeInfo(
    context,
    JSON.stringify({
      event: 'request.end',
      requestId: meta.requestId,
      operation: meta.operationName,
      method: meta.method,
      path: meta.path,
      statusCode,
      durationMs,
      ...(extras || {}),
    })
  );
}

function failRequest(context, meta, error, statusCode) {
  const durationMs = Date.now() - meta.startedAt;
  writeError(
    context,
    JSON.stringify({
      event: 'request.error',
      requestId: meta.requestId,
      operation: meta.operationName,
      method: meta.method,
      path: meta.path,
      statusCode,
      durationMs,
      error: error && error.message ? error.message : String(error || 'Unknown error'),
    })
  );
}

function writeInfo(context, message) {
  if (!context || !context.log) {
    return;
  }
  if (typeof context.log === 'function') {
    context.log(message);
    return;
  }
  if (typeof context.log.info === 'function') {
    context.log.info(message);
  }
}

function writeError(context, message) {
  if (!context || !context.log) {
    return;
  }
  if (typeof context.log.error === 'function') {
    context.log.error(message);
    return;
  }
  if (typeof context.log === 'function') {
    context.log(message);
  }
}

function withRequestId(headers, requestId) {
  return {
    ...(headers || {}),
    'x-request-id': requestId,
  };
}

module.exports = {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
};
