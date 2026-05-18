const {
  rateLimitMaxRequests,
  rateLimitPokerMaxRequests,
  rateLimitWindowMs,
} = require("../config/app.config");
const { AppError } = require("./errors");

const buckets = new Map();

function rateLimit(req, pathname) {
  if (req.method === "OPTIONS" || pathname === "/api/health") return;

  const limit = pathname.startsWith("/api/poker/") ? rateLimitPokerMaxRequests : rateLimitMaxRequests;
  const key = `${clientIp(req)}:${pathname}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return;
  }

  current.count += 1;
  if (current.count > limit) {
    throw new AppError(
      429,
      "Demasiadas peticiones. Espera unos segundos antes de reintentarlo.",
      { retryAfterMs: Math.max(0, current.resetAt - now), limit },
      "RATE_LIMITED"
    );
  }

  if (buckets.size > 5_000) pruneBuckets(now);
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "local";
}

function pruneBuckets(now = Date.now()) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

module.exports = { rateLimit };
