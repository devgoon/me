/**
 * @fileoverview Lightweight warm-up endpoint used by scheduled pings.
 * This endpoint performs no DB or external API work to keep invocations cheap.
 */

module.exports = async function (context, req) {
  try {
    if (context && context.log) {
      if (typeof context.log === 'function') context.log('[warmup] ping received');
      else if (typeof context.log.info === 'function') context.log.info('[warmup] ping received');
    }
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: true, warmedAt: new Date().toISOString() },
    };
  } catch (err) {
    if (context && context.log) {
      if (typeof context.log === 'function') context.log('[warmup] error', err && err.message ? err.message : String(err));
      else if (typeof context.log.error === 'function') context.log.error('[warmup] error', err && err.message ? err.message : String(err));
    }
    context.res = { status: 500, body: { ok: false, error: String(err) } };
  }
};
