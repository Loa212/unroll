# unroll — agent skill

Source-of-truth for the `unroll` [Agent Skill](https://github.com/agent-skills/spec). The skill teaches agents (Claude Code, Cursor, Cline, and any other skill-aware client) to fetch and cite X/Twitter threads via [unroll.loa212.com](https://unroll.loa212.com).

- [`SKILL.md`](./SKILL.md) — the skill itself (frontmatter + instructions)
- [`examples/`](./examples/) — worked interactions

## Using the skill

### Claude Code

Drop this directory into `~/.claude/skills/unroll/` (or your project's `.claude/skills/unroll/`). Claude Code picks up `SKILL.md` automatically.

### MCP-only (no skill framework)

If your client doesn't support skills but does support MCP, point it at `https://unroll.loa212.com/mcp` directly — the tools are self-describing. See the main repo's [`src/mcp/README.md`](../src/mcp/README.md) for per-client configuration.

## Publishing

This directory is the working copy. For indexing on skills.sh the same content is mirrored to the standalone [`Loa212/unroll-skill`](https://github.com/Loa212/unroll-skill) repo with `SKILL.md` at its root. Keep the two in sync by copying from here.

## License

MIT — same as the main repo.
