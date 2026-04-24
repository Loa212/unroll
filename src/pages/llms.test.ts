import { expect, test } from "bun:test";

const llmsTxt = Bun.file(new URL("./llms.txt", import.meta.url));

test("llms.txt exists and is non-empty plain text", async () => {
	expect(await llmsTxt.exists()).toBe(true);
	const text = await llmsTxt.text();
	expect(text.length).toBeGreaterThan(0);
});

test("llms.txt follows the llmstxt.org convention", async () => {
	const text = await llmsTxt.text();
	// H1 title and a blockquote summary are the two required elements.
	expect(text).toMatch(/^# unroll\b/m);
	expect(text).toMatch(/^> /m);
});

test("llms.txt documents all four usage modes and the repo link", async () => {
	const text = await llmsTxt.text();
	expect(text).toContain("https://unroll.loa212.com/");
	expect(text).toContain("/api/thread");
	expect(text).toContain("/mcp");
	expect(text).toContain("https://github.com/Loa212/unroll");
	expect(text).toMatch(/rate limit/i);
});
