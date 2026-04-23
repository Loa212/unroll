import { createMiddleware } from "better-call";
import { env } from "./env";

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
	ok: boolean;
	remaining: number;
	resetAt: number;
	limit: number;
};

export function rateLimit(
	key: string,
	max: number = env.RATE_LIMIT_MAX,
	windowMs: number = env.RATE_LIMIT_WINDOW_MS,
): RateLimitResult {
	const now = Date.now();
	const cutoff = now - windowMs;

	let bucket = buckets.get(key);
	if (!bucket) {
		bucket = { hits: [] };
		buckets.set(key, bucket);
	}

	let drop = 0;
	while (drop < bucket.hits.length) {
		const hit = bucket.hits[drop];
		if (hit === undefined || hit >= cutoff) break;
		drop++;
	}
	if (drop > 0) bucket.hits.splice(0, drop);

	if (bucket.hits.length >= max) {
		const oldest = bucket.hits[0] ?? now;
		return {
			ok: false,
			remaining: 0,
			resetAt: oldest + windowMs,
			limit: max,
		};
	}

	bucket.hits.push(now);
	return {
		ok: true,
		remaining: Math.max(0, max - bucket.hits.length),
		resetAt: now + windowMs,
		limit: max,
	};
}

setInterval(() => {
	const cutoff = Date.now() - env.RATE_LIMIT_WINDOW_MS;
	for (const [key, bucket] of buckets) {
		const lastHit = bucket.hits[bucket.hits.length - 1];
		if (lastHit === undefined || lastHit < cutoff) {
			buckets.delete(key);
		}
	}
}, 60_000).unref?.();

export function clientIp(request: Request): string {
	const xff = request.headers.get("x-forwarded-for");
	if (xff) {
		const first = xff.split(",")[0]?.trim();
		if (first) return first;
	}
	const cf = request.headers.get("cf-connecting-ip");
	if (cf) return cf;
	const real = request.headers.get("x-real-ip");
	if (real) return real;
	return "anonymous";
}

export function rateLimitHeaders(
	result: RateLimitResult,
): Record<string, string> {
	return {
		"RateLimit-Limit": String(result.limit),
		"RateLimit-Remaining": String(result.remaining),
		"RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
	};
}

export const rateLimitMiddleware = createMiddleware(
	{ requireRequest: true },
	async (ctx) => {
		const ip = clientIp(ctx.request);
		const result = rateLimit(ip);

		for (const [k, v] of Object.entries(rateLimitHeaders(result))) {
			ctx.setHeader(k, v);
		}

		if (!result.ok) {
			throw ctx.error("TOO_MANY_REQUESTS", {
				error: "rate_limited",
				resetAt: result.resetAt,
			});
		}

		return { rateLimit: result };
	},
);
