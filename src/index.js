import express from "express";
import rateLimter from "./middleware/rateLimter.js";
import "dotenv/config";
const app = express();

const port = process.env.PORT || 3000;

// Home route which sends Hello World as the response
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Route for limited requests, with rateLimiter middleware
app.get("/limited", rateLimter, (req, res) => {
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
