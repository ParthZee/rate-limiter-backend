import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Redis } from "ioredis";

// Ensure __dirname is available in ES module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const client = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  retryStrategy(times) {
    //redis keeps track of the count (times here)
    // reconnect every 2 seconds, up to a limit
    if (times > 10) return null;
    return 2000;
  },
});

client.on("connect", () => {
  console.log("Connected to Redis");
});

client.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

export default client;
