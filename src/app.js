import express from "express";
import fixedWindowRateLimiter from "./middleware/fixedWindow.js";
import { tokenBucketRateLimiter } from "./middleware/tokenBucket.js";

const app = express();

// Enable trust proxy so Express respects the X-Forwarded-For header,
// allowing us to simulate client IPs behind a proxy (e.g., for testing)
app.enable("trust proxy");

// Home route which sends Hello World as the response
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Route for limited requests, with appropriate rate limiting middleware
app.get("/limited", tokenBucketRateLimiter, (req, res) => {
  res.status(200).send("Limited Requests on this Route.");
});

// Route for unlimited requests
app.get("/unlimited", (req, res) => {
  res.send("Unlimited Requests on this Route.");
});

export default app;
