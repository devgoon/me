const { randomUUID } = require("crypto");

/**
 *
 * @param req
 */
export function getRequestId(req: any): string {
  const headerValue = req && req.headers
    ? (req.headers["x-request-id"] || req.headers["X-Request-Id"])
    : null;
  const normalized = headerValue ? String(headerValue).trim() : "";
  if (normalized) {
    return normalized;
  }
  try {
    return randomUUID();
  } catch (error) {
    return `req-${Date.now()}`;
  }
}

/**
 *
 * @param context
 * @param req
 * @param operationName
 */
export function beginRequest(context: any, req: any, operationName: string): any {
  const requestId = getRequestId(req);
  const startedAt = Date.now();
  const method = String((req && req.method) || "GET").toUpperCase();
  const path = String((req && req.url) || "");

  writeInfo(context, JSON.stringify({
    event: "request.start",
    requestId,
    operation: operationName,
    method,
    path
  }));

  return { requestId, startedAt, method, path, operationName };
}

/**
 *
 * @param context
 * @param meta
 * @param statusCode
 * @param extras
 */
export function endRequest(context: any, meta: any, statusCode: number, extras?: any): void {
  const durationMs = Date.now() - meta.startedAt;
  writeInfo(context, JSON.stringify({
    event: "request.end",
    requestId: meta.requestId,
    operation: meta.operationName,
    method: meta.method,
    path: meta.path,
    statusCode,
    durationMs,
    ...(extras || {})
  }));
}

/**
 *
 * @param context
 * @param meta
 * @param error
 * @param statusCode
 */
export function failRequest(context: any, meta: any, error: any, statusCode: number): void {
  const durationMs = Date.now() - meta.startedAt;
  writeError(context, JSON.stringify({
    event: "request.error",
    requestId: meta.requestId,
    operation: meta.operationName,
    method: meta.method,
    path: meta.path,
    statusCode,
    durationMs,
    error: error && error.message ? error.message : String(error || "Unknown error")
  }));
}

/**
 *
 * @param context
 * @param message
 */
function writeInfo(context: any, message: string): void {
  if (!context || !context.log) {
    return;
  }
  if (typeof context.log === "function") {
    context.log(message);
    return;
  }
  if (typeof context.log.info === "function") {
    context.log.info(message);
  }
}

/**
 *
 * @param context
 * @param message
 */
function writeError(context: any, message: string): void {
  if (!context || !context.log) {
    return;
  }
  if (typeof context.log.error === "function") {
    context.log.error(message);
    return;
  }
  if (typeof context.log === "function") {
    context.log(message);
  }
}

/**
 *
 * @param headers
 * @param requestId
 */
export function withRequestId(headers: any, requestId: string): any {
  return {
    ...(headers || {}),
    "x-request-id": requestId
  };
}
