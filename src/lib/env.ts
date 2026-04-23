import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(3000),
	DATABASE_URL: z
		.url({ message: "DATABASE_URL must be a valid connection string" }),
});

export const env = envSchema.parse({
	NODE_ENV: Bun.env.NODE_ENV,
	PORT: Bun.env.PORT,
	DATABASE_URL: Bun.env.DATABASE_URL,
});

export type Env = typeof env;
