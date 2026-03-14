const handler = require("../auth/index");

describe("auth API", () => {
  test("handler sets a response", async () => {
    const context = { res: null };
    await handler(context, { method: "GET", body: undefined });
    expect(context.res).toBeDefined();
    expect(typeof context.res.status).toBe("number");
  });
});
