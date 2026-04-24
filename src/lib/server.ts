import { createEndpoint, createRouter } from "better-call";
import { z } from "zod";
import { FxTwitterError } from "./fxtwitter";
import { singleTweetToMarkdown, threadToMarkdown } from "./markdown";
import { rateLimitMiddleware } from "./rate-limit";
import { fetchSingle, unrollThread } from "./unroll";

const startedAt = Date.now();

const formatQuery = z.object({
	url: z.string().min(1),
	format: z.enum(["markdown", "json"]).optional().default("markdown"),
});

export const health = createEndpoint("/health", { method: "GET" }, async () => {
	return { ok: true, uptime: (Date.now() - startedAt) / 1000 };
});

export const thread = createEndpoint(
	"/thread",
	{
		method: "GET",
		query: formatQuery,
		use: [rateLimitMiddleware],
	},
	async (ctx) => {
		try {
			const tweets = await unrollThread(ctx.query.url);
			const author = tweets[0]?.author;
			if (ctx.query.format === "json") {
				return { tweets, count: tweets.length, author };
			}
			return {
				content: threadToMarkdown(tweets),
				tweetCount: tweets.length,
				author,
			};
		} catch (err) {
			if (err instanceof FxTwitterError) {
				throw ctx.error(err.status === 404 ? "NOT_FOUND" : "BAD_GATEWAY", {
					error: err.message,
				});
			}
			if (err instanceof Error && err.message === "invalid_tweet_url") {
				throw ctx.error("BAD_REQUEST", { error: "invalid_tweet_url" });
			}
			throw err;
		}
	},
);

export const tweet = createEndpoint(
	"/tweet",
	{
		method: "GET",
		query: formatQuery,
		use: [rateLimitMiddleware],
	},
	async (ctx) => {
		try {
			const t = await fetchSingle(ctx.query.url);
			if (ctx.query.format === "json") {
				return { tweets: [t], count: 1, author: t.author };
			}
			return {
				content: singleTweetToMarkdown(t),
				tweetCount: 1,
				author: t.author,
			};
		} catch (err) {
			if (err instanceof FxTwitterError) {
				throw ctx.error(err.status === 404 ? "NOT_FOUND" : "BAD_GATEWAY", {
					error: err.message,
				});
			}
			if (err instanceof Error && err.message === "invalid_tweet_url") {
				throw ctx.error("BAD_REQUEST", { error: "invalid_tweet_url" });
			}
			throw err;
		}
	},
);

export const router = createRouter(
	{ health, thread, tweet },
	{ basePath: "/api" },
);
