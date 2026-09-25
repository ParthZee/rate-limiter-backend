# Rate Limiting Notes

## Fixed Window Counter Algorithm
A set number of requests can be made within a predefined time window. Requests increment a counter that resets to zero at the start of each window.

**Pros**
- Simple to implement and understand
- Predictable for users
- Very cheap to store - only two values are tracked per client (a request counter and the window's start timestamp), no per-request data at all

**Cons**
- Allows bursts up to 2x the limit when requests begin near the end of a window

**Use Case:**
Best when simplicity and low memory cost matter more than strict accuracy - internal service limits, login-attempt throttling, or basic API protection where an occasional boundary burst is an acceptable tradeoff. Not a good fit for anything where exact enforcement is required (billing, fraud-sensitive endpoints), since the boundary burst can let through nearly double the intended limit.

## Sliding Window Log Algorithm
Instead of resetting a counter all at once like fixed window, sliding window log tracks the timestamp of each individual request. On every new request, timestamps older than the window are discarded, and the request is allowed only if the number of remaining timestamps is below the limit.

**Pros**
- Accurate - no burst allowance at window boundaries, unlike fixed window
- No refill logic needed; the window "slides" naturally as old entries expire

**Cons**
- Higher memory/storage cost, since every individual request timestamp must be tracked (not just a count)

**Use Case:**
Best when exact enforcement genuinely matters more than memory efficiency - payment processing, authentication endpoints, or any API where an auditable log of individual request timestamps is valuable in itself. A poor fit for high-traffic, low-value endpoints, since the per-request storage cost scales directly with traffic volume rather than staying constant.

## Token Bucket Algorithm
Each request withdraws one token from the bucket, and when the bucket is empty (no available tokens) the next request will be blocked.  
Tokens are put in the bucket at preset rates periodically.

**Pros**
- Flexible in handling short-term burst requests
- Easy to understand and implement

**Cons**
- Memory consumption issue (at user level, maintaining number of tokens left for each user)

**Use Case:**
Best for general-purpose public APIs where traffic is naturally bursty rather than steady - it rewards a client that's been idle with the ability to burst back up to capacity, which matches how real applications actually call APIs far better than a strict per-second cap would. A poor fit where a downstream system genuinely cannot absorb any burst at all (a fragile legacy service, a database with hard connection limits) - a leaky bucket's steady, no-burst output would suit that case better.

## Comparison

| Algorithm | Accuracy | Memory Cost | Burst Handling | Best Suited For |
|---|---|---|---|---|
| Fixed Window Counter | Low - allows up to 2x limit at window boundaries | Very low (two values per client) | Poor - full boundary burst possible | Simple internal limits, login throttling |
| Sliding Window Log | Highest - exact, no boundary bugs | High - one entry per request in-window | None by design (strict enforcement) | Payment/auth endpoints, audit-sensitive APIs |
| Token Bucket | Approximate - burst-tolerant by design | Low (token count + timestamp per client) | Controlled bursts up to bucket capacity | General-purpose public APIs, bursty client traffic |

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
