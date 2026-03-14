const handler = require("../health/index");

describe("health API", () => {
  test("handler sets a response", async () => {
    const context = { res: null };
    await handler(context, { method: "GET" });
    expect(context.res).toBeDefined();
    expect(typeof context.res.status).toBe("number");
  });
});
