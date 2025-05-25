import express from "express";
import fixedWindowRateLimiter from "./middleware/fixedWindowRateLimiter.js";
import { tokenBucketRateLimiter } from "./middleware/tokenBucketRateLimiter.js";

const app = express();

// Home route which sends Hello World as the response
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Route for limited requests, with appropriate rate limiting middleware
app.get("/limited", tokenBucketRateLimiter, (req, res) => {
  res.send("Limited Requests on this Route.");
});

// Route for unlimited requests
app.get("/unlimited", (req, res) => {
  res.send("Unlimited Requests on this Route.");
});

export default app;
