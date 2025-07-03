import client from "../redis/client.js";
import crypto from "crypto";

const slidingWindowRateLimiter = async (req, res, next) => {
  try {
    const rawIp = req.ip;
    const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

    const currentTimestamp = Math.floor(Date.now() / 1000); // in seconds
    const WINDOW_SIZE = 60;
    const MAX_REQUESTS = 10;
    const PREFIX = "rate_limiter";

    // Remove entries older than the 60-second window
    // cutoffTimestamp marks the earliest valid timestamp (currentTime - WINDOW_SIZE)
    // Any score older than this falls outside the allowed window and gets removed
    const cutoffTimestamp = currentTimestamp - WINDOW_SIZE;

    // So min:0 to max: start of the window
    await client.zremrangebyscore(`${PREFIX}:${ip}`, 0, cutoffTimestamp);

    // Count the present entries in the sorted set (here for a particular user ip).
    const count = await client.zcard(`${PREFIX}:${ip}`);

    if (count < MAX_REQUESTS) {
      // we need uniqueMember just for the value of the set's entry
      const uniqueMember = `${currentTimestamp}:${crypto.randomUUID()}`;

      // Using the same value as score and value will conflict when multiple requests are passed
      // at the exact same time (second) so set won't save it so it will throw error during E2E testing
      await client.zadd(`${PREFIX}:${ip}`, currentTimestamp, uniqueMember);

      // Defining TTL
      await client.expire(`${PREFIX}:${ip}`, WINDOW_SIZE);
      return next();
    } else {
      // Getting the time of the first entry that will expire soon for the new request to be accepted
      const [member, firstScore] = await client.zrange(
        `${PREFIX}:${ip}`,
        0,
        0,
        "WITHSCORES"
      ); // 0 till 0 as in index, we only want first element.
      const firstEntrySeconds = parseInt(firstScore, 10);
      const retryAfterSeconds = Math.max(
        0,
        firstEntrySeconds + WINDOW_SIZE - currentTimestamp // if the current time is passed, is a lot, then the answer will become negative so retry after 0 in that case.
      );

      // Retry-After is a standard HTTP header for rate limiting
      res.setHeader("Retry-After", retryAfterSeconds);

      return res
        .status(429)
        .send(
          `Too Many Requests. Try again after ${retryAfterSeconds} seconds`
        );
    }
  } catch (err) {
    console.error("Rate Limiting Error: ", err);
    return res.status(500).send("Internal Server Error");
  }
};

export default slidingWindowRateLimiter;
