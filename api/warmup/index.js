/**
 * @fileoverview Lightweight warm-up endpoint used by scheduled pings.
 * This endpoint performs no DB or external API work to keep invocations cheap.
 */

module.exports = async function (context, req) {
  try {
    context.log('[warmup] ping received');
    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: { ok: true, warmedAt: new Date().toISOString() },
    };
  } catch (err) {
    context.log('[warmup] error', err && err.message ? err.message : String(err));
    context.res = { status: 500, body: { ok: false, error: String(err) } };
  }
};
