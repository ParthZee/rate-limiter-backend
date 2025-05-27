//Middleware to implement Fixed Window Rate Limiter
// Creating a map to store the ip addresses, their request count, and their first request time
const ipTracker = new Map();

// Middleware Function
const fixedWindowRateLimiter = (req, res, next) => {
  const rawIp = req.ip;
  const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp; //slicing as we are getting IPv6-mapped IPv4 address if executed on local machine (eg. ::ffff:127.0.0.1)
  const oneMin = 60000; //60,000 milliseconds

  // Condition to check if the client has not made request to the route before
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, { count: 1, firstReqTime: Date.now() });
  }

  // Client has already made request to the route before
  else {
    // Get data in the form of object from the ip address
    const clientData = ipTracker.get(ip);
    const timeElapsed = Date.now() - clientData.firstReqTime;

    if (clientData.count >= 10 && timeElapsed < oneMin) {
      // Here Math.ceil rounds the number to the highest nearest integer (5.1 -> 6)
      const retryAfterSeconds = Math.ceil((oneMin - timeElapsed) / 1000);

      // Retry-After is a standard HTTP header for rate limiting
      res.setHeader("Retry-After", retryAfterSeconds);

      return res
        .status(429)
        .send(
          `Too many requests, try again after ${retryAfterSeconds} seconds`
        );
    }

    if (timeElapsed >= oneMin) {
      clientData.count = 1;
      clientData.firstReqTime = Date.now();
    } else {
      clientData.count++;
    }
  }

  next();
};

export default fixedWindowRateLimiter;
