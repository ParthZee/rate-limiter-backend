import { tokenBucketAlgorithm, tokenBucketIpTracker, getDefaultConfig } from "../middleware/rateLimiter.js";
import { afterAll, jest } from "@jest/globals";
import { shutdownRedisClient } from "../redis/helper.js";

beforeEach(() => {
  tokenBucketIpTracker.clear();
});

afterAll(async () => {
  await shutdownRedisClient();
})

describe("Token Bucket Algorithm", () => {
  const ip = "192.0.2.1";
  const config = getDefaultConfig();

  // Test - 1
  test("A token should be decremented on a request call", () => {
    tokenBucketAlgorithm(ip, config);

    const clientData = tokenBucketIpTracker.get(ip);
    expect(clientData.currentTokens).toBe(9);

    tokenBucketAlgorithm(ip, config);
    expect(clientData.currentTokens).toBe(8);
  });

  // Test - 2
  test("Should block 11th request to the middleware if 0 tokens left", () => {
    // First 10 request calls
    for (let i = 1; i <= 10; i++) {
      tokenBucketAlgorithm(ip, config);
    }

    // 11th request when 0 tokens are left
    const result = tokenBucketAlgorithm(ip, config);
    let clientData = tokenBucketIpTracker.get(ip);

    expect(clientData.currentTokens).toBe(0);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).not.toBe(null);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  // Test - 3
  test("Refill and consumption net to the same pre-block count", () => {
    jest.useFakeTimers();

    tokenBucketAlgorithm(ip, config);
    let clientData = tokenBucketIpTracker.get(ip);
    expect(clientData.currentTokens).toBe(9);

    tokenBucketAlgorithm(ip, config);
    clientData = tokenBucketIpTracker.get(ip);
    expect(clientData.currentTokens).toBe(8);

    jest.advanceTimersByTime(6000);
    tokenBucketAlgorithm(ip, config);
    clientData = tokenBucketIpTracker.get(ip);
    // Should refill +1 (to 9), but request consumes 1 => back to 8
    expect(clientData.currentTokens).toBe(8);

    jest.useRealTimers();
  });

  // Test - 4
  test("Should allow 11th request after a token is refilled after 6 seconds", () => {
    jest.useFakeTimers();

    for (let i = 1; i <= 10; i++) {
      tokenBucketAlgorithm(ip, config);
    }

    // Now the 11th request call should be blocked at first
    let result = tokenBucketAlgorithm(ip, config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).not.toBe(null);
    expect(result.retryAfter).toBeGreaterThan(0);

    // Simulate refill of a single token after 6 seconds
    jest.advanceTimersByTime(6000);

    // Now the request call should be allowed as token is refilled
    result = tokenBucketAlgorithm(ip, config);

    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBe(null);
    jest.useRealTimers();
  });

  // Test - 5
  test("Token count should not exceed the bucket size limit (10)", () => {
    jest.useFakeTimers();

    tokenBucketAlgorithm(ip, config); // Now 9 tokens
    jest.advanceTimersByTime(60000); // Enough to generate 10 tokens
    tokenBucketAlgorithm(ip, config); // Triggers refill

    const clientData = tokenBucketIpTracker.get(ip);
    expect(clientData.currentTokens).toBe(9); // Instead of 18

    jest.useRealTimers();
  });
});
