const handler = require("../cache-report/index");

describe("cache-report API", () => {
  test("handler sets a response", async () => {
    const context = { res: null };
    await handler(context, { method: "POST", body: undefined });
    expect(context.res).toBeDefined();
    expect(typeof context.res.status).toBe("number");
  });
});
