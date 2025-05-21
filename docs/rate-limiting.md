# Rate Limiting Notes

## Fixed Window Counter Algorithm
A set number of requests can be made within a predefined time window. Requests increment a counter that resets to zero at the start of each window.

**Pros**
- Simple to implement and understand
- Predictable for users

**Cons**
- Allows bursts up to 2x the limit when requests begin near the end of a window

## Sliding Window Log Algorithm
Instead of refreshing the capacity all at once like in fixed window, sliding windows refill one request at a time.

**Pros**
- Flexible in handling short-term burst requests
- Easy to understand and implement

**Cons**
- Memory consumption issue (at user level, maintaining number of tokens left for each user)

## Token Bucket Algorithm
Each request withdraws one token from the bucket, and when the bucket is empty (no available tokens) the next request will be blocked.  
Tokens are put in the bucket at preset rates periodically.

**Pros**
- Flexible in handling short-term burst requests
- Easy to understand and implement

**Cons**
- Memory consumption issue (at user level, maintaining number of tokens left for each user)

## Leaky Bucket Algorithm
The leaking bucket algorithm is similar to the token bucket except that requests are processed at a fixed rate (eg. 2 req/s). It is usually implemented with a first-in-first-out (FIFO) queue.

**Pros**
- Stable traffic control as requests are handle at steady time.
- Easy to understand and implement

**Cons**
- Lacks flexibility in handling sudden traffic spikes

**Use Case:**
Stable traffic handling with minimal need for handling sudden spikes eg. Video Streaming, Network bandwidth management

## HTTP Methods

| Method | Description                        |
|--------|------------------------------------|
| GET    | Retrieve a resource                |
| POST   | Interact with a resource (mostly add) |
| PUT    | Replace a resource                 |
| PATCH  | Change part of a resource          |
| DELETE | Remove a resource                  |

## HTTP Status Codes

| Category Code | Description | Codes |
|---------------|-------------|--------|
| 1xx           | Information | 100 (Continue), 102 (Processing) |
| 2xx           | Success     | 200 (OK), 201 (Created), 202 (Accepted) |
| 3xx           | Redirection | 301 (Moved Permanently), 302 (Moved Temporarily) |
| 4xx           | Client Error| 429 (Too Many Requests), 401 (Unauthorized), 404 (Not Found) |
| 5xx           | Server Error| 500 (Internal Server Error), 503 (Service Unavailable) |

## Implementation Plan for RAL-9 & RAL-5

**Chosen Algorithm:** Fixed Window

### Limiting Strategy:
- Target: IP-based limiting
- Limit: 10 requests per minute
- Storage: In-memory (using a simple object or Map)

### Behavior:
- Count requests per IP
- Reset counters every 60 seconds
- If limit exceeded, return `429 Too Many Requests`
