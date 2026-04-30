/**
 * @fileoverview Observability helpers (request tracing, logging helpers).
 * @module api/_shared/observability.js
 */

const { randomUUID } = require('crypto');

/**
 * Derive or generate a request id for tracing logs. Prefers existing
 * `x-request-id` header and falls back to a UUID or timestamp-based id.
 *
 * @param {Object} req - Request-like object with `headers`.
 * @returns {string} Request id string.
 */
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

/**
 * Log the start of a request and return a metadata object used by end/fail.
 *
 * @param {Object} context - Executing function context (may include `log`).
 * @param {Object} req - Request object.
 * @param {string} operationName - Logical operation name for tracing.
 * @returns {{requestId:string,startedAt:number,method:string,path:string,operationName:string}}
 */
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

/**
 * Log request completion with duration and status.
 *
 * @param {Object} context - Executing function context.
 * @param {Object} meta - Metadata returned from `beginRequest`.
 * @param {number} statusCode - HTTP status code.
 * @param {Object} [extras] - Additional fields to include in the log.
 */
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

/**
 * Log a failed request including error message and duration.
 *
 * @param {Object} context - Executing function context.
 * @param {Object} meta - Metadata returned from `beginRequest`.
 * @param {Error|string} error - Error object or message.
 * @param {number} statusCode - HTTP status code to record.
 */
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

/**
 * Write an informational log line using the provided context's logging
 * facility (supports `context.log` function or object with `.info`).
 *
 * @param {Object} context - Context exposing logging methods.
 * @param {string} message - Message string to log.
 */
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

/**
 * Write an error log line using the provided context's logging facility.
 *
 * @param {Object} context - Context exposing logging methods.
 * @param {string} message - Message string to log.
 */
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

/**
 * Return a headers object augmented with `x-request-id`.
 *
 * @param {Object} headers - Existing headers object.
 * @param {string} requestId - Request id value to set.
 * @returns {Object} New headers object including `x-request-id`.
 */
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
