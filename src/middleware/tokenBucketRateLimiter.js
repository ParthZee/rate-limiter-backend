//Middleware to implement Token Bucket Rate Limiter
// Creating a map to store the ip addresses, their current tokens and the token's last refill time
const ipTracker = new Map();

const tokenBucketRateLimiter = (req, res, next) => {
  const rawIp = req.ip;
  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

  // Condition to check if the client has not made request to the route before
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, { currentTokens: 10, lastRefillTime: Date.now() });
  }
  // Client has already made request to the route before
  else {
    const clientData = ipTracker.get(ip);
    const timeLeftForToken = Math.floor(
      (Date.now() - clientData.lastRefillTime) / 1000
    ); // In seconds
    const tokensToAdd = timeLeftForToken / 6; // 1 token gets added every 6 seconds

    if (clientData.currentTokens < 0 && tokensToAdd < 0) {
      // Retry-After is a standard HTTP header for rate limiting
      res.setHeader("Retry-After", timeLeftForToken);

      return res
        .status(429)
        .send(`Too Many requests, try again after ${timeLeftForToken}`);
    }

    if (tokensToAdd > 0) {
      if (tokensToAdd > 10) {
        clientData.currentTokens = 10;
      } else {
        clientData.currentTokens = tokensToAdd;
      }
    }
    clientData.currentTokens--;
  }

  next();
};

export default tokenBucketRateLimiter;
