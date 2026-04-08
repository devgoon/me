/**
 * @fileoverview Authentication-related endpoints for user/session info.
 * @module api/auth/index.js
 */

const { getClientPrincipal } = require('../_shared/auth');
const {
  beginRequest,
  endRequest,
  failRequest,
  withRequestId,
} = require('../_shared/observability');

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

async function handleMe(req) {
  const principal = getClientPrincipal(req);
  if (principal && principal.email) {
    return {
      status: 200,
      body: {
        user: {
          id: principal.userId || principal.email,
          email: principal.email,
          fullName: principal.name || '',
          provider: principal.identityProvider || 'aad',
        },
      },
    };
  }

  // Log header keys when no principal found to help local dev debugging
  try {
    const headerKeys = req && req.headers ? Object.keys(req.headers) : [];
    console.log('[auth.me] no client principal; request header keys:', headerKeys);
  } catch {
    // ignore logging errors
  }

  return { status: 401, body: { error: 'Unauthorized' } };
}

module.exports = async function (context, req) {
  const obs = beginRequest(context, req, 'auth.me');
  const action = text(req && req.params && req.params.action).toLowerCase() || '';
  const method = text(req && req.method).toUpperCase();

  try {
    let response;
    if (method === 'GET' && action === 'me') {
      response = await handleMe(req);
    } else {
      response = { status: 405, body: { error: 'Method not allowed' } };
    }

    context.res = {
      status: response.status,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: response.body,
    };
    endRequest(context, obs, response.status);
  } catch {
    failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: withRequestId({ 'Content-Type': 'application/json' }, obs.requestId),
      body: { error: error.message || 'Authentication error' },
    };
  }
};
