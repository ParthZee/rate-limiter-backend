//Middleware to implement Token Bucket Rate Limiter
// Creating a map to store the ip addresses, their current tokens and the token's last refill time
const ipTracker = new Map();

const tokenBucketRateLimiter = (req, res, next) => {
  const rawIp = req.ip;
  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

  // Condition to check if the client has not made request to the route before
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, { currentTokens: 9, lastRefillTime: Date.now() }); // Token set as 9 as already a request has been made
  }
  // Client has already made request to the route before
  else {
    const clientData = ipTracker.get(ip);

    const msSinceLastRefill = Date.now() - clientData.lastRefillTime; // elapsed time
    const msUntilNextToken = 6000 - (msSinceLastRefill % 6000);
    const retryAfterSeconds = Math.ceil(msUntilNextToken / 1000);

    const tokensToAdd = Math.floor(msSinceLastRefill / 6000); // 1 token gets added every 6 seconds

    if (tokensToAdd > 0) {
      clientData.currentTokens = Math.min(
        10,
        clientData.currentTokens + tokensToAdd
      ); //if the tokens are greater than 10, it will take 10 as its minimum
      clientData.lastRefillTime += tokensToAdd * 6000;
    }

    if (clientData.currentTokens === 0) {
      // Retry-After is a standard HTTP header for rate limiting
      res.setHeader("Retry-After", retryAfterSeconds);

      return res
        .status(429)
        .send(`Too Many requests, try again after ${retryAfterSeconds}`);
    }
    clientData.currentTokens--;
  }

  next();
};

export default tokenBucketRateLimiter;
