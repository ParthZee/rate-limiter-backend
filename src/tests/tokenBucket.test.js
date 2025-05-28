import {
  tokenBucketRateLimiter,
  ipTracker,
} from "../middleware/tokenBucket.js";

import { jest } from "@jest/globals";

describe("Token Bucket Algorithm", () => {
  let req, res, next;

  beforeEach(() => {
    ipTracker.clear();
    req = { ip: "111.222.333.444" };
    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  // Unit Tests with jest
  // Test - 1
  test("A token should be decremented on a request call", () => {
    tokenBucketRateLimiter(req, res, next);

    const clientData = ipTracker.get(req.ip);
    expect(clientData.currentTokens).toBe(9);

    tokenBucketRateLimiter(req, res, next);
    expect(clientData.currentTokens).toBe(8);
  });

  // Test - 2
  test("Should block 11th request to the middleware if 0 tokens left", () => {
    // First 10 request calls
    for (let i = 1; i <= 10; i++) {
      tokenBucketRateLimiter(req, res, next);
    }
    res.send.mockClear();
    res.status.mockClear();
    next.mockClear();

    // 11th request when 0 tokens are left
    tokenBucketRateLimiter(req, res, next);
    let clientData = ipTracker.get(req.ip);

    expect(clientData.currentTokens).toBe(0);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  // Test - 3
  test("After 6 seconds, 1 token should be added to the client bucket", () => {
    jest.useFakeTimers();

    tokenBucketRateLimiter(req, res, next);
    let clientData = ipTracker.get(req.ip);
    expect(clientData.currentTokens).toBe(9);

    tokenBucketRateLimiter(req, res, next);
    clientData = ipTracker.get(req.ip);
    expect(clientData.currentTokens).toBe(8);

    jest.advanceTimersByTime(6000);
    tokenBucketRateLimiter(req, res, next);
    clientData = ipTracker.get(req.ip);
    expect(clientData.currentTokens).toBe(8); // Should refill +1 (to 9), but request consumes 1 => back to 8

    jest.useRealTimers();
  });

  // Test - 4
  test("Should allow 11th request after a token is refilled after 6 seconds", () => {
    jest.useFakeTimers();

    for (let i = 1; i <= 10; i++) {
      tokenBucketRateLimiter(req, res, next);
    }

    // Now the 11th request call should be blocked at first
    tokenBucketRateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    res.send.mockClear();
    res.status.mockClear();
    next.mockClear();

    jest.advanceTimersByTime(6000); //simulate refill of a single token after 6 seconds

    // Now the request call should be allowed as token is refilled
    tokenBucketRateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  // Test - 5
  test("Token count should not exceed the bucket size limit (10)", () => {
    jest.useFakeTimers();

    tokenBucketRateLimiter(req, res, next); // now 9
    jest.advanceTimersByTime(60000); // enough to generate 10 tokens
    tokenBucketRateLimiter(req, res, next); // triggers refill

    const clientData = ipTracker.get(req.ip);
    expect(clientData.currentTokens).toBeLessThanOrEqual(10);

    jest.useRealTimers();
  });
});
