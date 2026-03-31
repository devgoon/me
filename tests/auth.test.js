const { getClientPrincipal } = require("../api/_shared/auth");

jest.mock("../api/_shared/auth", () => ({
  getClientPrincipal: jest.fn()
}));

const authHandler = require("../auth/index");

function buildContext() {
  return {
    log: {
      error: jest.fn()
    },
    res: null
  };
}

describe("auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 401 when principal is missing", async () => {
    getClientPrincipal.mockReturnValue(null);

    const context = buildContext();
    await authHandler(context, {
      method: "GET",
      params: { action: "me" },
      headers: {}
    });

    expect(context.res.status).toBe(401);
    expect(context.res.body).toEqual({ error: "Unauthorized" });
  });

  test("returns principal details when authenticated", async () => {
    getClientPrincipal.mockReturnValue({
      userId: "test-user",
      email: "dev@lodovi.co",
      name: "Dev User",
      identityProvider: "aad"
    });

    const context = buildContext();
    await authHandler(context, {
      method: "GET",
      params: { action: "me" },
      headers: {}
    });

    expect(context.res.status).toBe(200);
    expect(context.res.body).toEqual({
      user: {
        id: "test-user",
        email: "dev@lodovi.co",
        fullName: "Dev User",
        provider: "aad"
      }
    });
  });
});
