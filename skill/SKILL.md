---
name: unroll
description: Extract, convert, cite, or summarize X/Twitter threads as clean markdown. Use when the user shares an x.com or twitter.com URL, or asks to read, save, cite, or analyze a tweet or thread.
---

# unroll skill

Fetches and converts X/Twitter threads to clean markdown via [unroll.loa212.com](https://unroll.loa212.com). No login, no API key, no tracking — powered by the public FxTwitter API.

## When to use

Trigger this skill when the user:

- Pastes or shares an `x.com` / `twitter.com` URL and wants the content (not just a preview).
- Asks to summarize, cite, quote, archive, or analyze a tweet or thread.
- Says things like "unroll this", "what does this thread say", "save this for later", or "give me a TLDR of this thread".

Do **not** trigger on non-X/Twitter URLs, on requests for tweet *images* only, or on X profile pages (unroll walks a thread from a specific tweet, not a user feed).

## How to use

### Preferred: MCP

If an MCP client is connected to `https://unroll.loa212.com/mcp`, call one of:

- `unroll_thread({ url })` — walks the reply chain upward from any tweet in the thread and returns the whole thread in order.
- `fetch_tweet({ url })` — single tweet only, no walking.
- `fetch_comments({ url, cursor? })` — top replies to a tweet (ranked by likes), parent included. Pass `cursor` from the previous response's `<!-- next_cursor: ... -->` footer to load the next page.

All return markdown by default and include the author handle. Prefer `fetch_comments` for "what are people saying"; prefer `unroll_thread` for the author's own follow-ups.

### Fallback: HTTP

If no MCP client is available, call the public endpoints directly.

Raw markdown (prepend pattern — drops the tweet URL straight after the origin):

```bash
curl -s 'https://unroll.loa212.com/https://x.com/jack/status/20'
```

JSON (structured tweet objects):

```bash
curl -s 'https://unroll.loa212.com/api/thread?url=https://x.com/jack/status/20&format=json'
```

Single tweet:

```bash
curl -s 'https://unroll.loa212.com/api/tweet?url=<tweet-url>&format=json'
```

Comments (top replies, first page only via prepend; pass `cursor` to the API to paginate):

```bash
curl -s 'https://unroll.loa212.com/comments/https://x.com/jack/status/20'
curl -s 'https://unroll.loa212.com/api/comments?url=<tweet-url>&format=json'
```

## Rate limits

60 requests per hour per IP. Responses include `RateLimit-*` headers; `429` with `{ "error": "rate_limited", "resetAt": <unix-ms> }` when exceeded. If a request is rate-limited, tell the user plainly — don't retry in a loop.

## After unrolling

- **Always cite the author.** Include their handle (e.g. `@jack`) and link the canonical X/Twitter URL of the first tweet.
- **Long threads (>10 tweets): lead with a 2–4 sentence summary**, then offer the full unroll on request. Don't dump a 40-tweet wall of text unprompted.
- **Short threads (≤10 tweets):** return the full markdown directly, no summary needed.
- **Preserve quoted tweets as blockquotes.** The markdown output already does this — keep it that way when you paraphrase.
- **Don't invent context.** If a tweet references something outside the thread (a link, a screenshot, an earlier post), say so rather than guessing.

## Examples

See [`examples/`](./examples/) for worked interactions.

## Source & self-hosting

Open source (MIT): https://github.com/Loa212/unroll
