import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { FxTwitterError } from "../lib/fxtwitter";
import { singleTweetToMarkdown, threadToMarkdown } from "../lib/markdown";
import { clientIp, rateLimit, rateLimitHeaders } from "../lib/rate-limit";
import { fetchSingle, unrollThread } from "../lib/unroll";

const UNROLL_THREAD_DESCRIPTION = [
	"Unroll an X/Twitter thread into clean markdown.",
	"",
	"Given any tweet URL that belongs to a thread, this walks up the reply chain",
	"while the author stays the same and returns the full thread in chronological",
	"order as markdown. Use this when the user shares an X/Twitter URL and you",
	"want the whole thread, not just the tweet they linked to.",
	"",
	"Accepts any tweet in the thread — the URL does not have to be the root.",
	"Supports x.com, twitter.com, mobile.twitter.com, and /i/status URLs.",
].join("\n");

const FETCH_TWEET_DESCRIPTION = [
	"Fetch a single X/Twitter tweet as markdown.",
	"",
	"Returns only the tweet at the given URL — does not walk the thread. Use this",
	"when you need the content of a specific tweet (for example, to quote it",
	"verbatim) and you already know you do not want surrounding replies.",
	"",
	"Prefer unroll_thread if you want the full thread.",
].join("\n");

function toolError(err: unknown): CallToolResult {
	let message: string;
	if (err instanceof FxTwitterError) {
		message = err.message;
	} else if (err instanceof Error && err.message === "invalid_tweet_url") {
		message = "Invalid tweet URL";
	} else if (err instanceof Error) {
		message = err.message;
	} else {
		message = "Unexpected error";
	}
	return { content: [{ type: "text", text: message }], isError: true };
}

function buildServer(): McpServer {
	const server = new McpServer(
		{ name: "unroll", version: "1.0.0" },
		{ capabilities: { tools: {} } },
	);

	server.registerTool(
		"unroll_thread",
		{
			description: UNROLL_THREAD_DESCRIPTION,
			inputSchema: {
				url: z.string().min(1).describe("URL of any tweet in the thread."),
			},
		},
		async ({ url }) => {
			try {
				const tweets = await unrollThread(url);
				return {
					content: [{ type: "text", text: threadToMarkdown(tweets) }],
				};
			} catch (err) {
				return toolError(err);
			}
		},
	);

	server.registerTool(
		"fetch_tweet",
		{
			description: FETCH_TWEET_DESCRIPTION,
			inputSchema: {
				url: z.string().min(1).describe("URL of the tweet."),
			},
		},
		async ({ url }) => {
			try {
				const tweet = await fetchSingle(url);
				return {
					content: [{ type: "text", text: singleTweetToMarkdown(tweet) }],
				};
			} catch (err) {
				return toolError(err);
			}
		},
	);

	return server;
}

export async function handleMcp(request: Request): Promise<Response> {
	const ip = clientIp(request);
	const limitResult = rateLimit(ip);
	const rlHeaders = rateLimitHeaders(limitResult);

	if (!limitResult.ok) {
		return new Response(
			JSON.stringify({
				jsonrpc: "2.0",
				id: null,
				error: {
					code: -32000,
					message: "Rate limit exceeded",
					data: { resetAt: limitResult.resetAt },
				},
			}),
			{
				status: 429,
				headers: {
					...rlHeaders,
					"Content-Type": "application/json",
				},
			},
		);
	}

	const transport = new WebStandardStreamableHTTPServerTransport({
		sessionIdGenerator: undefined,
		enableJsonResponse: true,
	});
	const server = buildServer();
	await server.connect(transport);

	try {
		const response = await transport.handleRequest(normalizeAccept(request));
		for (const [k, v] of Object.entries(rlHeaders)) {
			response.headers.set(k, v);
		}
		return response;
	} finally {
		await server.close();
	}
}

// MCP spec requires `Accept: application/json, text/event-stream` on POSTs.
// Bare curl (Accept: */*) or a missing header gets rejected as 406. Rewrite
// those to the spec-compliant value so the documented curl example works,
// while still validating explicit Accept headers from real clients.
function normalizeAccept(request: Request): Request {
	const accept = request.headers.get("accept");
	if (accept && accept !== "*/*") return request;
	const headers = new Headers(request.headers);
	headers.set("accept", "application/json, text/event-stream");
	return new Request(request, { headers });
}
