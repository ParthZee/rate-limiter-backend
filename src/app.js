import express from "express";
import { rateLimiter } from "./middleware/rateLimiter.js";
import swaggerUi from "swagger-ui-express";
import openapiSpecification from "../swagger.js"

const app = express();

// Enable trust proxy so Express respects the X-Forwarded-For header,
// allowing us to simulate client IPs behind a proxy (e.g., for testing)
app.enable("trust proxy");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));

// Dynamic rate limiter middleware that reads algorithm from query params
const dynamicRateLimiter = (req, res, next) => {
  const algorithm = req.query.algorithm || "fixed-window";
  req.algorithm = algorithm;   // attach it to req for downstream handlers

  // Create rate limiter with the specified algorithm
  const limiter = rateLimiter({ algorithm });

  // Apply the rate limiter
  limiter(req, res, next);
}


/**
 * @openapi
 * /:
 *  get:
 *    summary: Home route showing "Hello World"
 *    responses:
 *      '200':
 *        description: Successful response
 */
// Home route which sends Hello World as the response
app.get("/", (req, res) => {
  res.status(200).send("Hello World");
});

/**
 * @openapi
 * /limited:
 *  get:
 *    summary: Execute a rate-limited request
 *    description: >
 *      Executes a request through the rate limiter.
 *      The rate limiting algorithm can be selected
 *      using the algorithm query parameter.
 *    parameters:
 *      - in: query
 *        name: algorithm
 *        required: false
 *        schema:
 *          type: string
 *          default: fixed-window
 *          enum:
 *            - fixed-window
 *            - sliding-window
 *            - token-bucket
 *    responses:
 *      '200':
 *        description: Request allowed. Response body confirms which algorithm processed the request.
 *      '429':
 *        description: Too many requests. The client has exceeded the rate limit for the selected algorithm.
 *        headers:
 *          Retry-After:
 *            description: Number of seconds to wait before retrying.
 *            schema:
 *              type: integer
 *      '500':
 *        description: Internal server error
 */
// Route for limited requests with dynamic algorithm selection
app.get("/limited", dynamicRateLimiter, (req, res) => {
  res.status(200).send(`Limited Requests on this Route using ${req.algorithm} algorithm.`);
});

/**
 * @openapi
 * /unlimited:
 *  get:
 *    summary: Execute a simple request
 *    responses:
 *      '200':
 *        description: Successful response
 */
// Route for unlimited requests
app.get("/unlimited", (req, res) => {
  res.send("Unlimited Requests on this Route.");
});

export default app;
