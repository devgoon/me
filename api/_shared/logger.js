/**
 * Minimal logger wrapper that delegates to Azure Functions `context.log` when
 * available, otherwise falls back to console. Accepts optional `context` so
 * callers can pass the function context to get structured platform logging.
 */
'use strict';

function formatMessage(msg, meta) {
  if (!meta) return typeof msg === 'string' ? msg : String(msg);
  try {
    const metaStr = typeof meta === 'string' ? meta : JSON.stringify(meta);
    return typeof msg === 'string' ? `${msg} ${metaStr}` : `${String(msg)} ${metaStr}`;
  } catch {
    return String(msg);
  }
}

function _write(context, level, msg, meta) {
  const out = formatMessage(msg, meta);
  if (context && context.log) {
    try {
      if (typeof context.log[level] === 'function') {
        context.log[level](out);
        return;
      }
      if (typeof context.log === 'function') {
        context.log(out);
        return;
      }
    } catch {
      console.log(out);
    }
  }

  if (level === 'info') console.log(out);
  else if (level === 'warn') console.warn(out);
  else if (level === 'error') console.error(out);
  else console.log(out);
}

module.exports = {
  info: (context, msg, meta) => _write(context, 'info', msg, meta),
  warn: (context, msg, meta) => _write(context, 'warn', msg, meta),
  error: (context, msg, meta) => _write(context, 'error', msg, meta),
  debug: (context, msg, meta) => _write(context, 'info', `[debug] ${msg}`, meta),
};
