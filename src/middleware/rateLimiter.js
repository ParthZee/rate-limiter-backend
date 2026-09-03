import {
  cleanUpOldEntries,
  countActiveEntries,
  addEntryToWindow,
  getEntriesInRange,
  setKeyExpiry,
} from "../redis/helper.js";
import crypto from "crypto";

const DEFAULT_CONFIG = {
    algorithm: "fixed-window",
    maxRequests: 10,
    windowSizeMs: 60000, // 1 minute
    refillIntervalMs: 6000, // 6 seconds for token bucket
    bucketSize: 10, // for token bucket
    ttlMs: 60000, // 1 minute TTL for cleanup
    useRedis: false, // default to in-memory storage
    prefix: "rate_limiter",
};

const fixedWindowIpTracker = new Map();
const tokenBucketIpTracker = new Map();

export const fixedWindowAlgorithm = (ip, config) => {

    // The map memory of stale entries is cleared through this clean up method based on TTL duration
    for (const [key, value] of fixedWindowIpTracker.entries()) {
        if (Date.now() - value.firstReqTime >= config.ttlMs) {
            fixedWindowIpTracker.delete(key);
        }
    }

    if (!fixedWindowIpTracker.has(ip)) {
        fixedWindowIpTracker.set(ip, { count: 1, firstReqTime: Date.now() });
    }
    // Client has already made request to the route before
    else {
        // Get data in the form of object from the ip address
        const clientData = fixedWindowIpTracker.get(ip);
        const timeElapsed = Date.now() - clientData.firstReqTime;

        if (clientData.count >= config.maxRequests && timeElapsed < config.windowSizeMs) {
            // Here Math.ceil rounds the number to the highest nearest integer (5.1 -> 6)
            const retryAfterSeconds = Math.ceil(
                (config.windowSizeMs - timeElapsed) / 1000
            );

            return { 
                allowed: false,
                retryAfter: retryAfterSeconds 
            };
        }

        if (timeElapsed >= config.windowSizeMs) {
            clientData.count = 1;
            clientData.firstReqTime = Date.now();
        } else {
            clientData.count++;
        }
    }

    return { 
        allowed: true,
        retryAfter: null 
    };
};

export const tokenBucketAlgorithm = (ip, config) => {
    
    // Condition to check if the client has not made request to the route before
    if (!tokenBucketIpTracker.has(ip)) {
        tokenBucketIpTracker.set(ip, {
            currentTokens: config.bucketSize,
            lastRefillTime: Date.now(),
            lastSeen: Date.now(), // Adding this to then cleanup the map like TTL behaviour through setInterval
        }); // Token set as 10 (bucket size) and we decrement it at the end
    }

    const clientData = tokenBucketIpTracker.get(ip);
    clientData.lastSeen = Date.now();

    const msSinceLastRefill = Date.now() - clientData.lastRefillTime; // Elapsed time
    const msUntilNextToken = 
    config.refillIntervalMs - (msSinceLastRefill % config.refillIntervalMs);
    const retryAfterSeconds = Math.ceil(msUntilNextToken / 1000);

    // 1 token gets added every 6 seconds
    const tokensToAdd = Math.floor(msSinceLastRefill / config.refillIntervalMs);

    if (tokensToAdd > 0) {
        clientData.currentTokens = Math.min(
            config.bucketSize,
            clientData.currentTokens + tokensToAdd
        ); // If the tokens are greater than 10, it will take 10 as its minimum
        clientData.lastRefillTime += tokensToAdd * config.refillIntervalMs;
    }

    if (clientData.currentTokens <= 0) {
        return { 
                allowed: false,
                retryAfter: retryAfterSeconds 
        };
    }

    clientData.currentTokens--;

    return { 
        allowed: true,
        retryAfter: null
    };
};

// Clean-up interval for token bucket IPs.
// Multiple calls will fill up the map, the memory is cleared through this clean up method based on TTL duration
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of tokenBucketIpTracker.entries()) {
        if (now - data.lastSeen > DEFAULT_CONFIG.ttlMs) {
            tokenBucketIpTracker.delete(ip);
        }
    }
}, DEFAULT_CONFIG.ttlMs);

export const slidingWindowAlgorithm = async (ip, config) => {
    const key = `${config.prefix}:${ip}`;
    const windowSize = config.windowSizeMs / 1000;
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // Remove entries older than the 60-second window
    // cutoffTimestamp marks the earliest valid timestamp (currentTime - windowSize)
    // Any score older than this falls outside the allowed window and gets removed
    const cutoffTimestamp = currentTimestamp - windowSize;

    // Cleaning up expired entries
    await cleanUpOldEntries(key, cutoffTimestamp);

    // Counting number of requests
    const count = await countActiveEntries(key);

    if (count < config.maxRequests) {
        // we need uniqueMember just for the value of the set's entry
        const uniqueMember = `${currentTimestamp}:${crypto.randomUUID()}`;

        // Using the same value as score and value will conflict when multiple requests are passed
        // at the exact same time (second) so set won't save it so it will throw error during E2E testing.
        // Therefore we use a unique random UUID for it
        await addEntryToWindow(key, currentTimestamp, uniqueMember);

        // Defining TTL
        await setKeyExpiry(key, windowSize);
        return { 
            allowed: true,
            retryAfter: null
        };
    }
    else {
        // Getting the time of the first entry that will expire soon for the new request to be accepted
        const [member, firstScore] = await getEntriesInRange(key, 0, 0); // 0 till 0 as in index, we only want first element.
        const firstEntrySeconds = parseInt(firstScore, 10);
        const retryAfterSeconds = Math.max(
            0,
            firstEntrySeconds + windowSize - currentTimestamp // if the current time is passed, is a lot, then the answer will become negative so retry after 0 in that case.
        );

        return { 
            allowed: false,
            retryAfter: retryAfterSeconds 
        };
    }
};

export const rateLimiter = (options = {}) => {
    const config = { ...DEFAULT_CONFIG, ...options };

    return async (req, res, next) => {
        try {
            const rawIp = req.ip;
            // Slicing as we are getting IPv6-mapped IPv4 address if executed on local machine (eg. ::ffff:127.0.0.1)
            const ip = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

            let result;

            switch (config.algorithm) {
                case "fixed-window":
                    result = fixedWindowAlgorithm(ip, config);
                    break;
                case "token-bucket":
                    result = tokenBucketAlgorithm(ip, config);
                    break;
                case "sliding-window":
                    result = await slidingWindowAlgorithm(ip, config);
                    break;
                default:
                    result = fixedWindowAlgorithm(ip, config);
            }

            if (!result.allowed) {
                res.setHeader("Retry-After", result.retryAfter);
                return res
                .status(429)
                .send(
                    `Too Many Requests. Try again after ${result.retryAfter} seconds`
                );
            }

            next();
        }
        catch (error) {
            console.error("Rate Limiting Error:", error);
            return res.status(500).send("Internal Server Error");
        }
    };
};