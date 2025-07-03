import fixedWindowRateLimiter from "../middleware/fixedWindow.js";
import { jest } from "@jest/globals";

describe("Rate Limiter Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    // req, res and next as they are passed in the arguments below in the middleware

    // We didn't create a mock function here as we aren't calling the ip like a function (req.ip())
    // in the middleware instead passing a string
    req = { ip: "111.222.333.444" };
    res = {
      // Setting the value as jest.fn() to create a mock function so that we can record how it is called,
      // how many times, with which arguments and also whether it was called or not
      setHeader: jest.fn(),

      // .mockReturnThis() as we are chaining (res.status().send()) in the middleware
      // so this allows status to return a "res", so it behaves like res.send() next in chain
      status: jest.fn().mockReturnThis(),

      send: jest.fn(),
    };
    next = jest.fn();
  });

  // Test - 1
  test("Should allow first 10 requests to the middleware", () => {
    for (let i = 1; i <= 10; i++) {
      fixedWindowRateLimiter(req, res, next);
    }

    // If next() is called at the end then the middleware ran correctly and the request was passed successfully
    expect(next).toHaveBeenCalled();

    // res.status() should not have been called as next() is called at the end of the middleware
    expect(res.status).not.toHaveBeenCalled();
  });

  // Test - 2
  test("Should block 11th request to the middleware", () => {
    // First 10 request calls
    for (let i = 1; i <= 10; i++) {
      fixedWindowRateLimiter(req, res, next);
    }

    // Clearing the mocks to let the 11th request to generate fresh results
    res.send.mockClear();
    res.status.mockClear();
    next.mockClear();

    // The 11th request should now be blocked
    fixedWindowRateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  // Test - 3
  test("Should allow a request after rate limit resets in 1 minute", () => {
    jest.useFakeTimers();

    for (let i = 1; i <= 10; i++) {
      fixedWindowRateLimiter(req, res, next);
    }

    // Now the 11th request call should be blocked at first
    fixedWindowRateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);

    // Clear mocks since res.send, res.status and next were already called
    res.send.mockClear();
    res.status.mockClear();
    next.mockClear();

    // Simulate passing of 60 seconds
    jest.advanceTimersByTime(60000);

    // Now the request call should be allowed as a minute has passed by
    fixedWindowRateLimiter(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
