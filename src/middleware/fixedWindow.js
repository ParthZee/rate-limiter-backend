// Middleware to implement Fixed Window Rate Limiter
// Creating a map to store the ip addresses, their request count, and their first request time
const ipTracker = new Map();

const TTL_MS = 60000; // Time-to-live for inactive IPs
const MAX_REQUESTS = 10;
const WINDOW_SIZE_MS = 60000; // 1 minute

// Middleware Function
const fixedWindowRateLimiter = (req, res, next) => {
  const rawIp = req.ip;
  // Slicing as we are getting IPv6-mapped IPv4 address if executed on local machine (eg. ::ffff:127.0.0.1)
  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

  // The map memory of stale entries is cleared through this clean up method based on TTL duration
  for (const [key, value] of ipTracker.entries()) {
    if (Date.now() - value.firstReqTime >= TTL_MS) {
      ipTracker.delete(key);
    }
  }

  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, { count: 1, firstReqTime: Date.now() });
  }

  // Client has already made request to the route before
  else {
    // Get data in the form of object from the ip address
    const clientData = ipTracker.get(ip);
    const timeElapsed = Date.now() - clientData.firstReqTime;

    if (clientData.count >= MAX_REQUESTS && timeElapsed < WINDOW_SIZE_MS) {
      // Here Math.ceil rounds the number to the highest nearest integer (5.1 -> 6)
      const retryAfterSeconds = Math.ceil(
        (WINDOW_SIZE_MS - timeElapsed) / 1000
      );

      // Retry-After is a standard HTTP header for rate limiting
      res.setHeader("Retry-After", retryAfterSeconds);

      return res
        .status(429)
        .send(
          `Too Many Requests. Try again after ${retryAfterSeconds} seconds`
        );
    }

    if (timeElapsed >= WINDOW_SIZE_MS) {
      clientData.count = 1;
      clientData.firstReqTime = Date.now();
    } else {
      clientData.count++;
    }
  }

  next();
};

export default fixedWindowRateLimiter;
