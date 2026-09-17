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
// the `default` export to the local variable `slidingWindowAlgorithm`
const { slidingWindowAlgorithm, getDefaultConfig } = await import("../middleware/rateLimiter.js");
const { default: client } = await import("../redis/client.js");

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks(); // Ensures no lingering state
});

describe("Sliding Window Rate Limiter", () => {
  const ip = "192.0.2.1";
  const config = getDefaultConfig();

  // Test - 1: Allow request when under limit
  test("Allows request when under limit", async () => {
    client.zremrangebyscore.mockResolvedValue(0);
    client.zcard.mockResolvedValue(5);
    client.zadd.mockResolvedValue(1);
    client.expire.mockResolvedValue(1);

    const result = await slidingWindowAlgorithm(ip, config);

    expect(client.zremrangebyscore).toHaveBeenCalled();
    expect(client.zcard).toHaveBeenCalled();
    expect(client.zadd).toHaveBeenCalled();
    expect(client.expire).toHaveBeenCalled();
    
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(null);
  });

  // Test - 2: Block request when over limit
  test("Blocks request when over limit", async () => {
    client.zremrangebyscore.mockResolvedValue(0);
    client.zcard.mockResolvedValue(10);
    client.zrange.mockResolvedValue([
      "dummy",
      (Math.floor(Date.now() / 1000) - 50).toString(),
    ]);

    const result = await slidingWindowAlgorithm(ip, config);

    expect(client.zrange).toHaveBeenCalled();
    
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).not.toBe(null);
    expect(result.retryAfter).toBe(10);
  });

  // Test - 3: Remove outdated entries
  test("Removes outdated entries", async () => {
    client.zremrangebyscore.mockResolvedValue(1);
    client.zcard.mockResolvedValue(1);
    client.zadd.mockResolvedValue(1);
    client.expire.mockResolvedValue(1);

    await slidingWindowAlgorithm(ip, config);

    expect(client.zremrangebyscore).toHaveBeenCalledWith(
      expect.stringContaining("rate_limiter"),
      0,
      expect.any(Number)
    );
  });

  // Test - 4: Handle Redis error
  test("Should propagate an error when Redis fails", async () => {
    client.zremrangebyscore.mockRejectedValue(new Error("Redis down"));

    await expect(slidingWindowAlgorithm(ip, config)).rejects.toThrow("Redis down");
  });

  // Test - 5: Calculate retry after seconds
  test("Calculates correct retryAfterSeconds", async () => {
    const now = Math.floor(Date.now() / 1000);
    const oldScore = (now - 30).toString();

    client.zremrangebyscore.mockResolvedValue(0);
    client.zcard.mockResolvedValue(10);
    client.zrange.mockResolvedValue(["dummy", oldScore]);

    const result = await slidingWindowAlgorithm(ip, config);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).not.toBe(null);
    expect(result.retryAfter).toBe(30);
  });
});
