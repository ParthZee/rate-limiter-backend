import express from "express";
import { rateLimiter } from "./middleware/rateLimiter.js";

const app = express();

// Enable trust proxy so Express respects the X-Forwarded-For header,
// allowing us to simulate client IPs behind a proxy (e.g., for testing)
app.enable("trust proxy");

// Dynamic rate limiter middleware that reads algorithm from query params
const dynamicRateLimiter = (req, res, next) => {
  const algorithm = req.query.algorithm || "fixed-window";
  req.algorithm = algorithm;   // attach it to req for downstream handlers

  // Create rate limiter with the specified algorithm
  const limiter = rateLimiter({ algorithm });

  // Apply the rate limiter
  limiter(req, res, next);
}

// Home route which sends Hello World as the response
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Route for limited requests with dynamic algorithm selection
app.get("/limited", dynamicRateLimiter, (req, res) => {
  res.status(200).send(`Limited Requests on this Route using ${req.algorithm} algorithm.`);
});

// Route for unlimited requests
app.get("/unlimited", (req, res) => {
  res.send("Unlimited Requests on this Route.");
});

export default app;
