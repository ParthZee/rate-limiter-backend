import app from "../app.js";
import { ipTracker } from "../middleware/tokenBucket.js";
import { jest } from "@jest/globals";
import request from "supertest";

beforeEach(() => {
  ipTracker.clear();
  jest.useFakeTimers({ now: new Date("2025-05-25T00:00:00Z") });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("E2E Tests for Token Bucket Rate Limiter", () => {
  // Test - 1
  test("Should allow a request with avaiable tokens", async () => {
    const response = await request(app).get("/limited");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Limited Requests on this Route.");
  });

  // Test - 2
  test("Should block request after exceeding the token limit", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited");
    }

    // 11th request to be blocked
    const response = await request(app).get("/limited");
    expect(response.status).toBe(429);
  });

  // Test - 3
  test("should allow 11th request after token refills", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited");
    }

    // 11th request to be blocked
    const response = await request(app).get("/limited");
    expect(response.status).toBe(429);

    // Advancing the time by 6 seconds
    // jest.advanceTimersByTime(6000);
    jest.setSystemTime(new Date("2025-05-25T00:00:06Z"));

    // 11th request should pass
    await request(app).get("/limited").expect(200);
  });

  // Test - 4
  test("Token count should not exceed the bucket size limit (10)", async () => {
    await request(app).get("/limited").set("X-Forwarded-For", "1.2.3.4");

    jest.setSystemTime(new Date("2025-05-25T00:01:00Z"));

    // Making sure that the next request is from the same ip address, so used .set()
    await request(app).get("/limited").set("X-Forwarded-For", "1.2.3.4");

    const clientData = ipTracker.get("1.2.3.4");
    expect(clientData.currentTokens).toBeLessThanOrEqual(10);
  });

  // Test - 5
  test("Rate limiter should maintain separate token buckets for multiple clients", async () => {
    await request(app).get("/limited").set("X-Forwarded-For", "1.2.3.4");

    for (let i = 0; i < 5; i++) {
      await request(app).get("/limited").set("X-Forwarded-For", "5.6.7.8");
    }

    const clientA = ipTracker.get("1.2.3.4");
    const clientB = ipTracker.get("5.6.7.8");

    expect(clientA.currentTokens).toBe(9);
    expect(clientB.currentTokens).toBe(5);
  });
});
