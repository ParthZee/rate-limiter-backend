import express from "express";
import fixedWindowRateLimiter from "./middleware/fixedWindowRateLimiter.js";
import { tokenBucketRateLimiter } from "./middleware/tokenBucketRateLimiter.js";
import "dotenv/config";
const app = express();

const port = process.env.PORT || 3000;

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

// App listens to port 3000
app.listen(port, () => {
  console.log(`App is listening on port no. ${port}`);
});
