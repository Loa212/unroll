import { expect, test } from "bun:test";
import { handleMcp } from "./server";

function mcpRequest(body: unknown): Request {
	return new Request("http://localhost/mcp", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify(body),
	});
}

test("tools/list exposes unroll_thread and fetch_tweet", async () => {
	const res = await handleMcp(
		mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
	);
	expect(res.status).toBe(200);

	const payload = (await res.json()) as {
		result: { tools: Array<{ name: string; description: string }> };
	};
	const names = payload.result.tools.map((t) => t.name).sort();
	expect(names).toEqual(["fetch_tweet", "unroll_thread"]);

	for (const tool of payload.result.tools) {
		expect(tool.description.length).toBeGreaterThan(20);
	}
});

test("tools/call with invalid URL returns isError result", async () => {
	const res = await handleMcp(
		mcpRequest({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: {
				name: "unroll_thread",
				arguments: { url: "not a tweet url" },
			},
		}),
	);
	expect(res.status).toBe(200);

	const payload = (await res.json()) as {
		result: {
			isError?: boolean;
			content: Array<{ type: string; text: string }>;
		};
	};
	expect(payload.result.isError).toBe(true);
	expect(payload.result.content[0]?.text).toContain("Invalid tweet URL");
});

test("rate-limit headers are present on responses", async () => {
	const res = await handleMcp(
		mcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/list" }),
	);
	expect(res.headers.get("RateLimit-Limit")).not.toBeNull();
	expect(res.headers.get("RateLimit-Remaining")).not.toBeNull();
	expect(res.headers.get("RateLimit-Reset")).not.toBeNull();
});
