import { jest } from "@jest/globals";

// IMPORTANT: We use jest.unstable_mockModule for ES modules
jest.unstable_mockModule("../redis/client.js", () => ({
  default: {
    zremrangebyscore: jest.fn(),
    zcard: jest.fn(),
    zadd: jest.fn(),
    expire: jest.fn(),
    zrange: jest.fn(),
  },
}));

// Import AFTER mocking
// This type of import uses object destructuring to assign
// the `default` export to the local variable `slidingWindowRateLimiter`
const { default: slidingWindowRateLimiter } = await import(
  "../middleware/slidingWindow.js"
);
const { default: client } = await import("../redis/client.js");

describe("Sliding Window Rate Limiter", () => {
  let req, res, next;

  beforeEach(() => {
    req = { ip: "111.222.333.444" };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn(),
    };
    next = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks(); // Ensures no lingering state
  });

  // Test - 1: Allow request when under limit
  test("Allows request when under limit", async () => {
    client.zremrangebyscore.mockResolvedValue(0);
    client.zcard.mockResolvedValue(5);
    client.zadd.mockResolvedValue(1);
    client.expire.mockResolvedValue(1);

    await slidingWindowRateLimiter(req, res, next);

    expect(client.zremrangebyscore).toHaveBeenCalled();
    expect(client.zcard).toHaveBeenCalled();
    expect(client.zadd).toHaveBeenCalled();
    expect(client.expire).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  // Test - 2: Block request when over limit
  test("Blocks request when over limit", async () => {
    client.zremrangebyscore.mockResolvedValue(0);
    client.zcard.mockResolvedValue(10);
    client.zrange.mockResolvedValue([
      "dummy",
      (Math.floor(Date.now() / 1000) - 50).toString(),
    ]);

    await slidingWindowRateLimiter(req, res, next);

    expect(client.zrange).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("Try again after")
    );
    expect(next).not.toHaveBeenCalled();
  });

  // Test - 3: Remove outdated entries
  test("Removes outdated entries", async () => {
    client.zremrangebyscore.mockResolvedValue(1);
    client.zcard.mockResolvedValue(1);
    client.zadd.mockResolvedValue(1);
    client.expire.mockResolvedValue(1);

    await slidingWindowRateLimiter(req, res, next);

    expect(client.zremrangebyscore).toHaveBeenCalledWith(
      expect.stringContaining("rate_limiter"),
      0,
      expect.any(Number)
    );
  });

  // Test - 4: Handle Redis error
  test("Handles Redis client error gracefully", async () => {
    client.zremrangebyscore.mockRejectedValue(new Error("Redis down"));

    await slidingWindowRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Internal Server Error");
    expect(next).not.toHaveBeenCalled();
  });

  // Test - 5: Calculate retry after seconds
  test("Calculates correct retryAfterSeconds", async () => {
    const now = Math.floor(Date.now() / 1000);
    const oldScore = (now - 30).toString();

    client.zremrangebyscore.mockResolvedValue(0);
    client.zcard.mockResolvedValue(10);
    client.zrange.mockResolvedValue(["dummy", oldScore]);

    await slidingWindowRateLimiter(req, res, next);

    expect(res.send).toHaveBeenCalledWith(
      expect.stringContaining("Try again after 30 seconds")
    );
  });
});
