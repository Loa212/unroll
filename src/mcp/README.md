# unroll MCP server

unroll exposes its thread-to-markdown functionality as a remote [MCP](https://modelcontextprotocol.io) server. Any MCP-compatible client — Claude Desktop, Claude Code, Cursor, Cline, Zed, etc. — can call it to unroll X/Twitter threads into markdown without any local install.

The server speaks **Streamable HTTP** (stateless). One endpoint, no session, no auth — rate-limited per IP the same as the rest of the API (60 requests per hour by default).

**Endpoint:** `https://unroll.loa212.com/mcp`

## Tools

| Name            | Input           | Returns                                           |
|-----------------|-----------------|---------------------------------------------------|
| `unroll_thread` | `{ url: string }` | The full thread as markdown, in chronological order. |
| `fetch_tweet`   | `{ url: string }` | A single tweet as markdown (no thread walking).  |

Any X/Twitter URL is accepted (`x.com`, `twitter.com`, `mobile.twitter.com`, `/i/status/...`).

## Quick check

```bash
curl -X POST https://unroll.loa212.com/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

You should get back a JSON-RPC response listing `unroll_thread` and `fetch_tweet`.

## Client config

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "unroll": {
      "url": "https://unroll.loa212.com/mcp"
    }
  }
}
```

Restart Claude Desktop. The `unroll_thread` and `fetch_tweet` tools will be available in new conversations.

### Claude Code

```bash
claude mcp add --transport http unroll https://unroll.loa212.com/mcp
```

Or add to `~/.claude.json` / `.mcp.json` manually:

```json
{
  "mcpServers": {
    "unroll": {
      "type": "http",
      "url": "https://unroll.loa212.com/mcp"
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json` (global) or `<project>/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "unroll": {
      "url": "https://unroll.loa212.com/mcp"
    }
  }
}
```

### Self-hosted

If you are running unroll locally (`bun run dev`), point clients at `http://localhost:3100/mcp` instead.

## Errors

Tool calls that hit an invalid URL, a 404 tweet, or an upstream failure return a normal `CallToolResult` with `isError: true` and a short human-readable message in the `content` field.

If the per-IP rate limit is exceeded the endpoint returns HTTP 429 with a JSON-RPC error envelope (`code: -32000`, `resetAt` in the `data` field) and standard `RateLimit-*` headers.
