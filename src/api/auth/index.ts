import * as auth from "../_shared/auth";
import * as observability from "../_shared/observability";

/**
 * Converts a value to trimmed string or empty string if null/undefined.
 * @param {any} value - The value to convert.
 * @returns {string}
 */
function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

/**
 * Handles the 'me' action for authentication.
 * @param {object} req - The HTTP request object.
 * @returns {Promise<object>}
 */
async function handleMe(req) {
  const principal = auth.getClientPrincipal(req);
  if (principal && principal.email) {
    return {
      status: 200,
      body: {
        user: {
          id: principal.userId || principal.email,
          email: principal.email,
          fullName: principal.name || "",
          provider: principal.identityProvider || "aad"
        }
      }
    };
  }

  return { status: 401, body: { error: "Unauthorized" } };
}

module.exports = async function(context, req) {
  const obs = observability.beginRequest(context, req, "auth.me");
  const action = text(req && req.params && req.params.action).toLowerCase() || "";
  const method = text(req && req.method).toUpperCase();

  try {
    let response;
    if (method === "GET" && action === "me") {
      response = await handleMe(req);
    } else {
      response = { status: 405, body: { error: "Method not allowed" } };
    }

    context.res = {
      status: response.status,
      headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: response.body
    };
    observability.endRequest(context, obs, response.status);
  } catch (error) {
    observability.failRequest(context, obs, error, 500);
    context.res = {
      status: 500,
      headers: observability.withRequestId({ "Content-Type": "application/json" }, obs.requestId),
      body: { error: error.message || "Authentication error" }
    };
  }
};
