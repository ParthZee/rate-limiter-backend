import app from "../app.js";
import { jest } from "@jest/globals";
import request from "supertest";

beforeEach(() => {
  // Reset any tracking data and use fake timers
  jest.useFakeTimers({ now: new Date("2025-05-25T00:00:00Z") });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("E2E Tests for Fixed Window Rate Limiter", () => {
  // Test - 1
  test("Should allow first 10 requests within the window", async () => {
    for (let i = 1; i <= 10; i++) {
      const response = await request(app).get("/limited");
      expect(response.status).toBe(200);
      expect(response.text).toBe("Limited Requests on this Route.");
    }
  });

  // Test - 2
  test("Should block 11th request within the same window", async () => {
    // First 10 requests should pass
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/limited");
    }

    // 11th request should be blocked
    const response = await request(app).get("/limited");
    expect(response.status).toBe(429);
  });

  // Test - 3
  test("Should allow requests after window resets (60 seconds)", async () => {
    // Fill up the window with 10 requests
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/limited");
    }

    // 11th request should be blocked
    const blockedResponse = await request(app).get("/limited");
    expect(blockedResponse.status).toBe(429);

    // Advance time by 60 seconds to reset the window
    jest.advanceTimersByTime(60000);

    // Request should now be allowed as window has reset
    const allowedResponse = await request(app).get("/limited");
    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.text).toBe("Limited Requests on this Route.");
  });

  // Test - 4
  test("Should maintain separate windows for different IP addresses", async () => {
    // Client A makes 8 requests
    for (let i = 1; i <= 8; i++) {
      const response = await request(app)
        .get("/limited")
        .set("X-Forwarded-For", "1.2.3.4");
      expect(response.status).toBe(200);
      expect(response.status).not.toBe(429);
    }

    // Client B makes 5 requests
    for (let i = 1; i <= 5; i++) {
      const response = await request(app)
        .get("/limited")
        .set("X-Forwarded-For", "5.6.7.8");
      expect(response.status).toBe(200);
      expect(response.status).not.toBe(429);
    }
  });

  // Test - 5
  test("Should handle requests at window boundary correctly", async () => {
    // Use a unique IP to avoid interference from other tests
    const testIP = "192.168.1.100";

    // Make 10 requests at the start of window
    for (let i = 1; i <= 10; i++) {
      await request(app).get("/limited").set("X-Forwarded-For", testIP);
    }

    // Should be blocked
    const blockedResponse = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", testIP);
    expect(blockedResponse.status).toBe(429);

    // Advance time by 59 seconds (still within the same window)
    jest.advanceTimersByTime(59000);

    // Should still be blocked
    const stillBlockedResponse = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", testIP);
    expect(stillBlockedResponse.status).toBe(429);

    // Advance time by 1 more second (total 60 seconds - window resets)
    jest.advanceTimersByTime(1000);

    // Should now be allowed
    const allowedResponse = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", testIP);
    expect(allowedResponse.status).toBe(200);
  });
});
