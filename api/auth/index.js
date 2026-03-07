const { getClientPrincipal } = require("../_shared/auth");

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
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
          fullName: principal.name || "",
          provider: principal.identityProvider || "aad"
        }
      }
    };
  }

  return { status: 401, body: { error: "Unauthorized" } };
}

module.exports = async function(context, req) {
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
      headers: { "Content-Type": "application/json" },
      body: response.body
    };
  } catch (error) {
    context.log.error("auth endpoint failed", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: error.message || "Authentication error" }
    };
  }
};
