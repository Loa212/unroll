# unroll

[![CI](https://github.com/Loa212/unroll/actions/workflows/ci.yml/badge.svg)](https://github.com/Loa212/unroll/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/Loa212/unroll?style=social)](https://github.com/Loa212/unroll)

**Tweet threads → clean markdown. No login, no key, no signup.**

Live at **[unroll.loa212.com](https://unroll.loa212.com)**.

Paste any X/Twitter URL and unroll walks the reply chain back to the root, then hands back the whole thread as markdown (or JSON). Built for humans who want to save threads, and for agents who want a parseable version of them.

---

## Four ways to use

### 1. Web UI

Open [unroll.loa212.com](https://unroll.loa212.com), paste a tweet or thread URL, hit **Unroll**. Copy or download the result as Markdown or JSON.

### 2. Prepend pattern

Stick `unroll.loa212.com/` in front of any tweet URL in your browser bar:

```
https://unroll.loa212.com/https://x.com/jack/status/20
```

You get raw markdown back — handy for sharing, piping into `pbcopy`, or feeding to an LLM.

### 3. JSON API

```bash
curl 'https://unroll.loa212.com/api/thread?url=https://x.com/jack/status/20&format=json'
```

Endpoints:

| Method | Path             | Query                                    | Notes                              |
|--------|------------------|------------------------------------------|------------------------------------|
| GET    | `/api/thread`    | `url` (required), `format=markdown\|json` | Walks upward from the given tweet. |
| GET    | `/api/tweet`     | `url` (required), `format=markdown\|json` | Single tweet, no walking.          |
| GET    | `/api/health`    | —                                        | Uptime check.                      |

Markdown responses come back wrapped as `{ content, tweetCount, author }`. JSON responses return `{ tweets, count, author }`.

### 4. MCP server

unroll speaks [MCP](https://modelcontextprotocol.io) over streamable HTTP at [`/mcp`](https://unroll.loa212.com/mcp). Any MCP-compatible client (Claude Desktop, Claude Code, Cursor, Cline, Zed, …) can call `unroll_thread` or `fetch_tweet` without a local install.

Claude Desktop config snippet:

```json
{
  "mcpServers": {
    "unroll": {
      "url": "https://unroll.loa212.com/mcp"
    }
  }
}
```

Full setup instructions (Claude Code, Cursor, self-hosting) live in [`src/mcp/README.md`](./src/mcp/README.md).

### Agent skill

If your agent supports [Agent Skills](https://github.com/agent-skills/spec), the [`skill/`](./skill) directory packages unroll as a drop-in skill — point your client at `skill/SKILL.md` and it'll know when and how to call the MCP server (or the HTTP fallback).

---

## Rate limits

Public endpoints (`/api/*` and the prepend routes) are rate-limited per IP.

- **60 requests per hour** per IP by default
- Responses include `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` headers
- `429` with `{ error: "rate_limited", resetAt }` when exceeded

If you need higher limits, self-host — it's one `bun install` away.

---

## Self-hosting

Requirements: [Bun](https://bun.sh) ≥ 1.0.

```bash
git clone https://github.com/Loa212/unroll
cd unroll
bun install
cp .env.example .env
bun run dev
```

Server listens on `http://localhost:3100`. The SQLite cache lives at `./data/cache.db` by default (auto-created).

### Configuration

All config lives in `.env` (see [`.env.example`](./.env.example)):

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3100` | HTTP port |
| `SQLITE_PATH` | `./data/cache.db` | On-disk cache file. Directory is created automatically. |
| `USER_AGENT` | `unroll.sh/1.0 (+...)` | Sent to `api.fxtwitter.com` on every outbound request. Include a contact URL. |
| `RATE_LIMIT_MAX` | `60` | Requests per window, per IP |
| `RATE_LIMIT_WINDOW_MS` | `3600000` | Window in ms (default: 1 hour) |
| `TWITTER_ID` | — | Optional. Numeric account ID used as a hint when walking threads. |

### Docker

A production `Dockerfile` is included. It exposes port `3000` and persists `/app/data` as a volume. A healthcheck hits `/api/health`.

```bash
docker build -t unroll .
docker run -p 3000:3000 -v $(pwd)/data:/app/data unroll
```

---

## Architecture

Intentionally small. No framework, no ORM, no build step beyond what Bun does on the fly.

- **Runtime** — [Bun](https://bun.sh) with `Bun.serve()` for HTTP + HTML imports
- **Router** — [better-call](https://github.com/bekacru/better-call) for the typed `/api/*` endpoints
- **Frontend** — [Preact](https://preactjs.com) + plain CSS, bundled by Bun's HTML imports (no Vite, no webpack)
- **Cache** — `bun:sqlite` with a single `tweet_cache` table. Tweets are immutable, so entries never expire.
- **Source of truth** — the public [FxTwitter](https://github.com/FxEmbed/FxEmbed) API (`api.fxtwitter.com/i/status/:id`)
- **Validation** — [Zod](https://zod.dev) for env parsing and query schemas

The thread-walk algorithm lives in [`src/lib/unroll.ts`](./src/lib/unroll.ts): fetch the leaf, walk `replying_to_status` upward while the author stays the same, reverse. That's it.

---

## Credits

This project exists because of:

- **[FxEmbed / FxTwitter](https://github.com/FxEmbed/FxEmbed)** — the public API unroll depends on. If you find this useful, consider supporting them.
- **[markdown.new](https://markdown.new/)** — inspired the "prepend any URL" UX pattern that makes the browser-bar workflow work.

---

## License

[MIT](./LICENSE).
