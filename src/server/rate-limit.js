import { createHash } from "node:crypto";

export function requestAddress(request) {
  const forwarded = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request?.headers?.get("x-real-ip") || forwarded || "unknown";
}

function bucketKey(scope, subject, secret) {
  return createHash("sha256").update(`cutcatch:${secret}:${scope}:${subject}`).digest("hex");
}

export async function consumeRateLimit(db, { scope, subject, limit, windowSeconds, secret = process.env.AUTH_SECRET }) {
  if (!secret || !scope || !subject || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new Error("rate_limit_configuration_invalid");
  }
  const key = bucketKey(scope, subject, secret);
  const rows = await db.$queryRaw`
    INSERT INTO "RateLimitBucket" ("key", "windowStartedAt", "attempts")
    VALUES (${key}, NOW(), 1)
    ON CONFLICT ("key") DO UPDATE SET
      "windowStartedAt" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= NOW() - (${windowSeconds} * INTERVAL '1 second') THEN NOW()
        ELSE "RateLimitBucket"."windowStartedAt"
      END,
      "attempts" = CASE
        WHEN "RateLimitBucket"."windowStartedAt" <= NOW() - (${windowSeconds} * INTERVAL '1 second') THEN 1
        ELSE "RateLimitBucket"."attempts" + 1
      END
    RETURNING "attempts", "windowStartedAt"
  `;
  const bucket = rows[0];
  const retryAt = new Date(bucket.windowStartedAt).getTime() + windowSeconds * 1000;
  return { allowed: bucket.attempts <= limit, retryAfterSeconds: Math.max(1, Math.ceil((retryAt - Date.now()) / 1000)) };
}

export async function limitResponse(db, request, { scope, subject, limit, windowSeconds }) {
  const ip = requestAddress(request);
  const results = await Promise.all([
    consumeRateLimit(db, { scope: `${scope}:ip`, subject: ip, limit, windowSeconds }),
    ...(subject ? [consumeRateLimit(db, { scope: `${scope}:subject`, subject: subject.toLowerCase(), limit: Math.ceil(limit / 2), windowSeconds })] : []),
  ]);
  return results.every((result) => result.allowed) ? null : Math.max(...results.map((result) => result.retryAfterSeconds));
}
