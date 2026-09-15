import { getDefaultConfig, fixedWindowAlgorithm } from "../middleware/rateLimiter.js";
import { jest } from "@jest/globals";
import { shutdownRedisClient } from "../redis/helper.js";

afterAll(async () => {
  await shutdownRedisClient();
})

describe("Fixed Window Unit Tests", () => {
  const config = getDefaultConfig();

  // Test - 1
  test("Should allow first 10 requests to the middleware", () => {
    const ip = "192.0.2.1";
    for (let i = 1; i <= 10; i++) {
      const result = fixedWindowAlgorithm(ip, config);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(null);
    }
  });

  // Test - 2
  test("Should block 11th request to the middleware", () => {
    const ip = "192.0.2.2";
    let result;
    // First 10 request calls
    for (let i = 1; i <= 10; i++) {
      result = fixedWindowAlgorithm(ip, config);
    }

    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(null);

    // The 11th request should now be blocked
    result = fixedWindowAlgorithm(ip, config);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).not.toBe(null);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  // Test - 3
  test("Should allow a request after rate limit resets in 1 minute", () => {
    const ip = "192.0.2.3";
    jest.useFakeTimers();

    for (let i = 1; i <= 10; i++) {
      fixedWindowAlgorithm(ip, config);
    }

    // Now the 11th request call should be blocked at first
    let result = fixedWindowAlgorithm(ip, config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).not.toBe(null);
    expect(result.retryAfter).toBeGreaterThan(0);

    // Simulate passing of 60 seconds
    jest.advanceTimersByTime(60000);

    // Now the request call should be allowed as a minute has passed by
    result = fixedWindowAlgorithm(ip, config);

    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(null);

    jest.useRealTimers();
  });
});
