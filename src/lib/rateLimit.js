// Lightweight in-memory sliding window rate limiter
// Protects endpoints from burst denial of service and API spend exhaustion

const rateLimitStore = new Map();

// Periodic sweep every 5 minutes to prevent memory leaks from inactive IPs
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Checks if a request exceeds rate limits.
 *
 * @param {Request} req - Next.js Request object
 * @param {Object} options
 * @param {number} options.limit - Max allowed requests per window
 * @param {number} options.windowMs - Window size in milliseconds
 * @param {string} [options.action='default'] - Scope identifier for different actions
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(req, { limit = 60, windowMs = 60 * 1000, action = "default" } = {}) {
  // Extract client IP with fallback
  const forwarded = req.headers?.get?.("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.headers?.get?.("x-real-ip") || "127.0.0.1";

  const key = `${action}:${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };

  // Reset window if expired
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  rateLimitStore.set(key, record);

  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);

  return {
    allowed,
    limit,
    remaining,
    resetTime: record.resetTime,
  };
}
