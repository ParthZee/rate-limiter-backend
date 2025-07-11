// Middleware to implement Token Bucket Rate Limiter
// Creating a map to store the ip addresses, their current tokens and the token's last refill time
const ipTracker = new Map();

const REFILL_INTERVAL_MS = 6000; // Time interval (in milliseconds) to add one token
const BUCKET_SIZE = 10; // Maximum number of tokens in the bucket
const TTL_MS = 60000; // 1 minute TTL

const tokenBucketRateLimiter = (req, res, next) => {
  const rawIp = req.ip;
  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

  // Condition to check if the client has not made request to the route before
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, {
      currentTokens: BUCKET_SIZE,
      lastRefillTime: Date.now(),
      lastSeen: Date.now(), // Adding this to then cleanup the map like TTL behaviour through setInterval
    }); // Token set as 10 (bucket size) and we decrement it at the end
  }

  const clientData = ipTracker.get(ip);
  clientData.lastSeen = Date.now();

  const msSinceLastRefill = Date.now() - clientData.lastRefillTime; // Elapsed time
  const msUntilNextToken =
    REFILL_INTERVAL_MS - (msSinceLastRefill % REFILL_INTERVAL_MS);
  const retryAfterSeconds = Math.ceil(msUntilNextToken / 1000);

  const tokensToAdd = Math.floor(msSinceLastRefill / REFILL_INTERVAL_MS); // 1 token gets added every 6 seconds

  if (tokensToAdd > 0) {
    clientData.currentTokens = Math.min(
      BUCKET_SIZE,
      clientData.currentTokens + tokensToAdd
    ); // If the tokens are greater than 10, it will take 10 as its minimum
    clientData.lastRefillTime += tokensToAdd * REFILL_INTERVAL_MS;
  }

  if (clientData.currentTokens <= 0) {
    // Retry-After is a standard HTTP header for rate limiting
    res.setHeader("Retry-After", retryAfterSeconds);

    return res
      .status(429)
      .send(`Too Many Requests. Try again after ${retryAfterSeconds} seconds`);
  }

  clientData.currentTokens--;
  next();
};

// Multiple calls will fill up the map, the memory is cleared through this clean up method based on TTL duration
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipTracker.entries()) {
    if (now - data.lastSeen > TTL_MS) {
      ipTracker.delete(ip);
    }
  }
}, TTL_MS);

export { tokenBucketRateLimiter, ipTracker };
