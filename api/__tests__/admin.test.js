const { Client } = require("pg");
const { getClientPrincipal } = require("../_shared/auth");

jest.mock("pg", () => ({
  Client: jest.fn()
}));

jest.mock("../_shared/auth", () => ({
  getClientPrincipal: jest.fn()
}));

const adminHandler = require("../admin/index");

function buildContext() {
  return {
    log: {
      error: jest.fn()
    },
    res: null
  };
}

describe("admin API", () => {
  let client;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
    client = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
      end: jest.fn().mockResolvedValue(undefined)
    };
    Client.mockImplementation(() => client);
  });

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  test("returns 401 when principal is missing", async () => {
    getClientPrincipal.mockReturnValue(null);

    const context = buildContext();
    await adminHandler(context, {
      method: "GET",
      headers: {},
      body: null
    });

    expect(context.res.status).toBe(401);
    expect(context.res.body).toEqual({ error: "Unauthorized" });
    expect(Client).not.toHaveBeenCalled();
  });

  test("returns clear validation error when salary min exceeds max", async () => {
    getClientPrincipal.mockReturnValue({ email: "dev@lodovi.co" });

    client.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const context = buildContext();
    await adminHandler(context, {
      method: "POST",
      headers: {},
      body: {
        profile: {
          email: "dev@lodovi.co",
          salaryMin: "200000",
          salaryMax: "100000"
        }
      }
    });

    expect(context.res.status).toBe(500);
    expect(context.res.body).toEqual({ error: "Salary min cannot be greater than salary max" });
    expect(client.query).toHaveBeenCalledTimes(1);
  });

  test("creates candidate profile on first authenticated load", async () => {
    getClientPrincipal.mockReturnValue({ email: "new.user@lodovi.co" });

    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 9 }] })
      .mockResolvedValueOnce({ rows: [{ id: 9, name: "new user", email: "new.user@lodovi.co" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const context = buildContext();
    await adminHandler(context, {
      method: "GET",
      headers: {},
      body: null
    });

    expect(context.res.status).toBe(200);
    expect(client.query.mock.calls[1][0]).toContain("INSERT INTO candidate_profile");
  });

  test("cache report includes is_cached flag", async () => {
    getClientPrincipal.mockReturnValue({ email: "admin@example.com" });
    client.query.mockImplementationOnce(() => Promise.resolve()) // connect
      .mockImplementationOnce(() => Promise.resolve({
        rows: [
          {
            question: "What is AI?",
            model: "claude-sonnet-4-20250514",
            cache_hit_count: 5,
            last_accessed: "2026-03-09T12:00:00Z",
            is_cached: true
          },
          {
            question: "What is ML?",
            model: "claude-sonnet-4-20250514",
            cache_hit_count: 2,
            last_accessed: "2026-03-09T11:00:00Z",
            is_cached: false
          }
        ]
      })) // cache report query
      .mockImplementationOnce(() => Promise.resolve()); // end

    const context = buildContext();
    await adminHandler.cacheReport(context, {
      method: "GET",
      headers: {},
      body: null
    });

    expect(context.res.status).toBe(200);
    expect(context.res.body).toEqual([
      {
        question: "What is AI?",
        model: "claude-sonnet-4-20250514",
        cache_hit_count: 5,
        last_accessed: "2026-03-09T12:00:00Z",
        is_cached: true
      },
      {
        question: "What is ML?",
        model: "claude-sonnet-4-20250514",
        cache_hit_count: 2,
        last_accessed: "2026-03-09T11:00:00Z",
        is_cached: false
      }
    ]);
  });
});
