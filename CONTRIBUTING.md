# Contributing

Thanks for your interest in unroll. This is a small project with a narrow scope — please keep changes focused.

## Dev loop

```bash
bun install
cp .env.example .env
bun run dev
```

The server listens on `http://localhost:3100` by default. The SQLite cache lives at `./data/cache.db`.

## Before opening a PR

Run the same checks CI will run:

```bash
bun run format:check   # biome format
bun run lint:check     # biome lint
bun run typecheck      # tsc --noEmit
bun test               # only if tests exist
```

CI will block merge on any of these failing. Fix formatting with `bun run format` and lint auto-fixes with `bun run lint`. `bun run check` runs all Biome steps at once (format + lint + import organization).

## Scope

- Bug fixes and small UX improvements are welcome — just open an issue first if the change is non-trivial.
- New features that expand surface area (new endpoints, new integrations, new dependencies) should be discussed in an issue before you start coding.
- The project deliberately depends on [FxTwitter](https://github.com/FxEmbed/FxEmbed) for thread data. Don't swap in another source without a strong reason.

## Commit style

Short, imperative commit subjects. Body (optional) should explain *why* when the *what* isn't obvious from the diff.

## Code of Conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
