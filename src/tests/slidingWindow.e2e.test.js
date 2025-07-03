import app from "../app.js";
import { jest } from "@jest/globals";
import request from "supertest";
import client from "../redis/client.js";

// Reset timers before/after each test
beforeEach(async () => {
  jest.useFakeTimers({ now: new Date("2025-05-25T00:00:00Z") });
  await client.flushdb();
});

afterEach(() => {
  jest.useRealTimers();
});

// imported the redis client and closing it to handle "the worker process failed to exit gracefully error".
afterAll(async () => {
  await client.quit();
});

describe("E2E Tests for Sliding Window Rate Limiter", () => {
  // Test - 1
  test("Should allow request within limit", async () => {
    const response = await request(app).get("/limited");
    expect(response.status).toBe(200);
    expect(response.text).toBe("Limited Requests on this Route.");
  });

  // Test - 2
  test("Should block request after exceeding limit", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited");
    }

    const response = await request(app).get("/limited");
    expect(response.status).toBe(429);
    expect(response.text).toMatch(/Try again after \d+ seconds/);
  });

  // Test - 3
  test("Should allow request after enough time has passed", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited");
    }

    const blocked = await request(app).get("/limited");
    expect(blocked.status).toBe(429);

    // Move 61 seconds ahead
    jest.setSystemTime(new Date("2025-05-25T00:01:01Z"));

    const allowed = await request(app).get("/limited");
    expect(allowed.status).toBe(200);
  });

  // Test - 4
  test("Rate limiter tracks IP separately", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited").set("X-Forwarded-For", "1.2.3.4");
    }

    // Other IP should be unaffected
    const response = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "5.6.7.8");
    expect(response.status).toBe(200);
  });

  // Test - 5
  test("Should gradually allow requests as old ones expire", async () => {
    // Send 10 requests to fill the window
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited").set("X-Forwarded-For", "1.2.3.4");
    }

    // 11th request should be blocked
    const blocked = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "1.2.3.4");
    expect(blocked.status).toBe(429);

    // Advance time by 30 seconds
    jest.setSystemTime(new Date("2025-05-25T00:00:30Z"));

    // Still might be blocked depending on sliding window implementation
    const midWindow = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "1.2.3.4");
    expect([200, 429]).toContain(midWindow.status);

    // Advance time to clear all previous timestamps (61s total)
    jest.setSystemTime(new Date("2025-05-25T00:01:01Z"));

    const allowed = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "1.2.3.4");
    expect(allowed.status).toBe(200);
  });

  // Test - 6
  test("Should apply rate limit separately to each IP", async () => {
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited").set("X-Forwarded-For", "10.0.0.1");
    }

    // This IP is blocked now
    const blocked = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "10.0.0.1");
    expect(blocked.status).toBe(429);

    // New IP should not be blocked
    const other = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "10.0.0.2");
    expect(other.status).toBe(200);
  });

  // Test - 7
  test("Should return correct retry-after seconds in error message", async () => {
    const now = new Date("2025-05-25T00:00:00Z");
    jest.setSystemTime(now);

    // Send 10 requests to hit the limit
    for (let i = 0; i < 10; i++) {
      await request(app).get("/limited").set("X-Forwarded-For", "8.8.8.8");
    }

    // Advance time by 10 seconds
    jest.setSystemTime(new Date(now.getTime() + 10000));

    // 11th request should be blocked, retry after should be ~50
    const res = await request(app)
      .get("/limited")
      .set("X-Forwarded-For", "8.8.8.8");

    expect(res.status).toBe(429);
    expect(res.text).toContain("Try again after 50 seconds");
  });
});
