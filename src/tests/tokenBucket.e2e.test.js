import app from "../app.js";
import { tokenBucketIpTracker } from "../middleware/rateLimiter.js";
import { jest } from "@jest/globals";
import request from "supertest";
import { shutdownRedisClient } from "../redis/helper.js";

beforeEach(() => {
  tokenBucketIpTracker.clear();

  // Reset any tracking data and use fake timers
  jest.useFakeTimers({ now: new Date("2025-05-25T00:00:00Z") });
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async () => {
  await shutdownRedisClient();
})

describe("E2E Tests for Token Bucket Rate Limiter", () => {
  
  // Test - 1
  test("Should allow a request with available tokens", async () => {
    const response = await request(app).get("/limited?algorithm=token-bucket");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Limited Requests on this Route using token-bucket algorithm.");
  });

  // Test - 2
  test("Should block request after exceeding the token limit", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited?algorithm=token-bucket");
    }

    // 11th request to be blocked
    const response = await request(app).get("/limited?algorithm=token-bucket");
    expect(response.status).toBe(429);
  });

  // Test - 3
  test("should allow 11th request after token refills", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited?algorithm=token-bucket");
    }

    // 11th request to be blocked
    const response = await request(app).get("/limited?algorithm=token-bucket");
    expect(response.status).toBe(429);

    // Advancing the time by 6 seconds
    jest.setSystemTime(new Date("2025-05-25T00:00:06Z"));

    // 11th request should pass
    await request(app).get("/limited?algorithm=token-bucket").expect(200);
  });

  // Test - 4
  test("Token count should not exceed the bucket size limit (10)", async () => {
    await request(app).get("/limited?algorithm=token-bucket").set("X-Forwarded-For", "192.0.2.3");

    jest.setSystemTime(new Date("2025-05-25T00:01:00Z"));

    // Making sure that the next request is from the same ip address, so used .set()
    await request(app).get("/limited?algorithm=token-bucket").set("X-Forwarded-For", "192.0.2.3");

    const clientData = tokenBucketIpTracker.get("192.0.2.3");
    expect(clientData.currentTokens).toBeLessThanOrEqual(10);
  });

  // Test - 5
  test("Rate limiter should maintain separate token buckets for multiple clients", async () => {
    await request(app).get("/limited?algorithm=token-bucket").set("X-Forwarded-For", "192.0.2.3");

    for (let i = 0; i < 5; i++) {
      await request(app).get("/limited?algorithm=token-bucket").set("X-Forwarded-For", "192.0.2.4");
    }

    const clientA = tokenBucketIpTracker.get("192.0.2.3");
    const clientB = tokenBucketIpTracker.get("192.0.2.4");

    expect(clientA.currentTokens).toBe(9);
    expect(clientB.currentTokens).toBe(5);
  });
});
