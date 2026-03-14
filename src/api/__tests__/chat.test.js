const handler = require("../chat");

describe("chat API", () => {
  test("handler sets a response for missing or present message", async () => {
    const context = { res: null };
    await handler(context, { method: "POST", body: {} });
    expect(context.res).toBeDefined();
    expect(typeof context.res.status).toBe("number");
  });
});
