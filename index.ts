import { env } from "./src/lib/env";
import { FxTwitterError } from "./src/lib/fxtwitter";
import { threadToMarkdown } from "./src/lib/markdown";
import { clientIp, rateLimit, rateLimitHeaders } from "./src/lib/rate-limit";
import { router } from "./src/lib/server";
import { unrollThread } from "./src/lib/unroll";
import { handleMcp } from "./src/mcp/server";
import homepage from "./src/pages/index.html";

async function handlePrepend(request: Request, source: string) {
	const ip = clientIp(request);
	const result = rateLimit(ip);
	const headers = {
		...rateLimitHeaders(result),
		"Content-Type": "text/markdown; charset=utf-8",
	};

	if (!result.ok) {
		return new Response(
			JSON.stringify({ error: "rate_limited", resetAt: result.resetAt }),
			{
				status: 429,
				headers: { ...headers, "Content-Type": "application/json" },
			},
		);
	}

	try {
		const tweets = await unrollThread(source);
		return new Response(threadToMarkdown(tweets), { status: 200, headers });
	} catch (err) {
		if (err instanceof FxTwitterError) {
			return new Response(`# Error\n\n${err.message}\n`, {
				status: err.status === 404 ? 404 : 502,
				headers,
			});
		}
		if (err instanceof Error && err.message === "invalid_tweet_url") {
			return new Response("# Error\n\nInvalid tweet URL\n", {
				status: 400,
				headers,
			});
		}
		return new Response("# Error\n\nUnexpected error\n", {
			status: 500,
			headers,
		});
	}
}

const server = Bun.serve({
	port: env.PORT,
	routes: {
		"/": homepage,
		"/api/*": router.handler,
		"/mcp": handleMcp,
	},
	async fetch(request) {
		const url = new URL(request.url);
		const pathname = url.pathname;

		if (pathname.startsWith("/http")) {
			// Reconstruct the source URL after the leading `/`. We keep the raw
			// search string so things like `?s=46` are preserved.
			const source = `${pathname.slice(1)}${url.search}`;
			return handlePrepend(request, source);
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Listening on ${server.url}`);
