import rateLimit from "express-rate-limit";

/**
 * Standard rate limit for authenticated API endpoints.
 * 100 requests per minute per IP.
 */
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests, please try again later" } },
});

/**
 * Strict rate limit for auth endpoints (login, signup, password reset).
 * 10 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many authentication attempts, please try again later" } },
});

/**
 * Rate limit for AI endpoints (expensive operations).
 * 20 requests per minute per IP.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "AI request limit exceeded, please try again later" } },
});

/**
 * Rate limit for billing/payment endpoints.
 * 30 requests per minute per IP.
 */
export const billingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many billing requests, please try again later" } },
});
