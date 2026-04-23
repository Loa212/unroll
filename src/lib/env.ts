import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3000),
	SQLITE_PATH: z.string().default("./data/cache.db"),
	USER_AGENT: z
		.string()
		.default("unroll.sh/1.0 (+https://github.com/Loa212/unroll)"),
	RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
	RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),
	TWITTER_ID: z.string().optional(),
});

export const env = envSchema.parse({
	NODE_ENV: Bun.env.NODE_ENV,
	PORT: Bun.env.PORT,
	SQLITE_PATH: Bun.env.SQLITE_PATH,
	USER_AGENT: Bun.env.USER_AGENT,
	RATE_LIMIT_MAX: Bun.env.RATE_LIMIT_MAX,
	RATE_LIMIT_WINDOW_MS: Bun.env.RATE_LIMIT_WINDOW_MS,
	TWITTER_ID: Bun.env.TWITTER_ID,
});

export type Env = typeof env;
