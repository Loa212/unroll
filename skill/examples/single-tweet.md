# Example: single-tweet citation

**User:** Can you grab the text of this tweet for me? https://x.com/jack/status/20

**Agent (with MCP connected):**

Calls `fetch_tweet({ url: "https://x.com/jack/status/20" })` on the unroll MCP server.

Responds with the tweet text and a citation:

> "just setting up my twttr"
>
> — [@jack](https://x.com/jack/status/20), 21 March 2006

**Agent (HTTP fallback):**

```bash
curl -s 'https://unroll.loa212.com/api/tweet?url=https://x.com/jack/status/20&format=json'
```

Parses the JSON response, then cites the same way.

## Why this works

Single-tweet requests don't need thread-walking. `fetch_tweet` / `/api/tweet` is one round trip and avoids pulling replies the user didn't ask for.
