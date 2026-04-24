# Example: long-thread summary

**User:** TLDR this thread https://x.com/someauthor/status/1234567890

**Agent (with MCP connected):**

Calls `unroll_thread({ url: "https://x.com/someauthor/status/1234567890" })`. The tool returns the full thread as markdown plus the tweet count.

Because the thread is long (say, 18 tweets), the agent leads with a summary:

> **Summary** — @someauthor argues that X, and walks through three examples: A, B, and C. They close by pointing to [linked paper] as further reading.
>
> *Full thread (18 tweets) — [@someauthor](https://x.com/someauthor/status/1234567890)*. Want me to paste the whole unroll?

Only expands to the full markdown if the user says yes.

**Agent (HTTP fallback):**

```bash
curl -s 'https://unroll.loa212.com/api/thread?url=https://x.com/someauthor/status/1234567890&format=json'
```

Same behavior: summary first, full unroll on request.

## Why this works

Long threads are expensive for the user to skim. Leading with the summary respects their attention; offering the full unroll keeps the detail one turn away.
