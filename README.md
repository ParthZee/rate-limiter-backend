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
- Supertest (E2E testing)
- Jest (unit testing)
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
│   │   └── client.js
│   ├── tests/
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

This project includes both unit tests and end-to-end tests. You can run all tests using:

```bash
npm test
```

Unit tests cover the core logic of individual algorithms.
End-to-End tests validate the behavior of the middleware in a real Express environment, using Supertest.
