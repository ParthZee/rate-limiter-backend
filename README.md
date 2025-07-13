# Rate Limiter Backend

## What is Rate Limiting?

Rate limiting is a technique used to control the number of requests a client can make to a server within a specific time frame. It helps prevent abuse, protects APIs from overload, and ensures fair usage among clients.

## Project Overview

This project implements a backend API rate limiter using different algorithms. It allows developers to limit repeated requests from the same IP address to specific routes, thereby preventing misuse and ensuring system stability. It is written in Node.js using Express, and includes both in-memory and Redis-based algorithms along with comprehensive test coverage.

## Features

- Middleware-based integration for Express.js routes
- Multiple rate limiting algorithms supported
- Redis support for distributed rate limiting
- Easy to configure window size and request limits
- Includes both unit and E2E test suites
- Built-in Retry-After headers for API clients
- IP-based request tracking with optional X-Forwarded-For support

## Technologies Used

- Node.js
- Express.js
- Redis
- Jest (unit testing)
- Supertest (E2E testing)
- dotenv (for environment variable management)

## Available Rate Limiting Algorithms

- Fixed Window Counter (in-memory)
- Token Bucket (in-memory with refill interval)
- Sliding Window Log (Redis-backed)

You can easily switch the algorithm in app.js by replacing the imported middleware.

## Project Structure

```
rate-limiter-backend/
├── docs/
│   └── rate-limiting.md
├── src/
│   ├── middleware/
│   │   ├── fixedWindow.js
│   │   ├── slidingWindow.js
│   │   └── tokenBucket.js
│   ├── redis/
│   │   ├── client.js
│   │   └── helper.js
│   ├── tests/
│   │   ├── fixedWindow.e2e.test.js
│   │   ├── fixedWindow.test.js
│   │   ├── slidingWindow.e2e.test.js
│   │   ├── slidingWindow.test.js
│   │   ├── tokenBucket.e2e.test.js
│   │   └── tokenBucket.test.js
│   ├── app.js
│   └── server.js
├── .env
├── .gitignore
├── jest.config.js
├── package-lock.json
├── package.json
└── README.md
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
PORT=3000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

## Running Tests

This project includes both unit tests and end-to-end tests for each rate limiting algorithm. To run tests for a specific middleware, use one of the following commands:

```bash
npm run test:fixed    # Runs Fixed Window unit and E2E tests
npm run test:token    # Runs Token Bucket unit and E2E tests
npm run test:sliding  # Runs Sliding Window unit and E2E tests
```

Unit tests cover the core logic of individual algorithms.
End-to-End tests validate the behavior of the middleware in a real Express environment, using Supertest.

**Important:** Before running a test command, ensure that the corresponding middleware is imported and used in `app.js` on the `/limited` route. See the next section for details.

## Middleware Test Isolation

To avoid test failures and ensure accurate results, only the middleware you want to test should be imported and used in `app.js` on the `/limited` route. Each test script in `package.json` is designed to run the tests for a single rate limiter.

**How to test a specific middleware:**

1. In `app.js`, import and use the desired middleware on the `/limited` route. For example:

   ```js
   import fixedWindowRateLimiter from "./middleware/fixedWindow.js";
   app.get("/limited", fixedWindowRateLimiter, ...);
   ```

2. Run the corresponding test command for that middleware, as listed above in the Running Tests section.

Repeat this process for other middlewares by updating `app.js` and running the appropriate test command.
