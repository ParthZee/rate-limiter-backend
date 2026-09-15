import app from "../app.js";
import { afterAll, jest } from "@jest/globals";
import request from "supertest";
import { fixedWindowIpTracker } from "../middleware/rateLimiter.js";
import { shutdownRedisClient } from "../redis/helper.js";

beforeEach(() => {
  fixedWindowIpTracker.clear();

  // Reset any tracking data and use fake timers
  jest.useFakeTimers({ now: new Date("2025-05-25T00:00:00Z") });
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(async () => {
  await shutdownRedisClient();
})

describe("E2E Tests for Fixed Window Rate Limiter", () => {
  // Test - 1
  test("Should allow first 10 requests within the window", async () => {
    for (let i = 1; i <= 10; i++) {
      const response = await request(app).get("/limited?algorithm=fixed-window");
      expect(response.status).toBe(200);
      expect(response.text).toBe("Limited Requests on this Route using fixed-window algorithm.");
    }
  });

  // Test - 2
  test("Should block 11th request within the same window", async () => {
    // First 10 requests should pass
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/limited?algorithm=fixed-window");
    }

    // 11th request should be blocked
    const response = await request(app).get("/limited?algorithm=fixed-window");
    expect(response.status).toBe(429);
  });

  // Test - 3
  test("Should allow requests after window resets (60 seconds)", async () => {
    // Fill up the window with 10 requests
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/limited?algorithm=fixed-window");
    }

    // 11th request should be blocked
    const blockedResponse = await request(app).get("/limited?algorithm=fixed-window");
    expect(blockedResponse.status).toBe(429);

    // Advance time by 60 seconds to reset the window
    jest.advanceTimersByTime(60000);

    // Request should now be allowed as window has reset
    const allowedResponse = await request(app).get("/limited?algorithm=fixed-window");
    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.text).toBe("Limited Requests on this Route using fixed-window algorithm.");
  });

  // Test - 4
  test("Should maintain separate windows for different IP addresses", async () => {
    // Client A makes 8 requests
    for (let i = 1; i <= 8; i++) {
      const response = await request(app).get("/limited?algorithm=fixed-window").set("X-Forwarded-For", "192.0.2.1");
      expect(response.status).toBe(200);
      expect(response.text).toBe("Limited Requests on this Route using fixed-window algorithm.");
      expect(response.status).not.toBe(429);
    }

    // Client B makes 5 requests
    for (let i = 1; i <= 5; i++) {
      const response = await request(app).get("/limited?algorithm=fixed-window").set("X-Forwarded-For", "192.0.2.2");
      expect(response.status).toBe(200);
      expect(response.text).toBe("Limited Requests on this Route using fixed-window algorithm.");
      expect(response.status).not.toBe(429);
    }
  });

  // Test - 5
  test("Should handle requests at window boundary correctly", async () => {

    // Make 10 requests at the start of window
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/limited?algorithm=fixed-window");
    }

    // Should be blocked
    const blockedResponse = await request(app).get("/limited?algorithm=fixed-window");
    expect(blockedResponse.status).toBe(429);

    // Advance time by 59 seconds (still within the same window)
    jest.advanceTimersByTime(59000);

    // Should still be blocked
    const stillBlockedResponse = await request(app).get("/limited?algorithm=fixed-window");
    expect(stillBlockedResponse.status).toBe(429);

    // Advance time by 1 more second (total 60 seconds - window resets)
    jest.advanceTimersByTime(1000);

    // Should now be allowed
    const allowedResponse = await request(app).get("/limited?algorithm=fixed-window");
    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.text).toBe("Limited Requests on this Route using fixed-window algorithm.");
  });
});
