import { Database } from "bun:sqlite";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { env } from "./env";
import type { FxTwitterResponse } from "./fxtwitter";

mkdirSync(dirname(env.SQLITE_PATH), { recursive: true });

const db = new Database(env.SQLITE_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
	CREATE TABLE IF NOT EXISTS tweet_cache (
		id TEXT PRIMARY KEY,
		json TEXT NOT NULL,
		fetched_at INTEGER NOT NULL
	)
`);

const getStmt = db.query<{ json: string }, [string]>(
	"SELECT json FROM tweet_cache WHERE id = ?",
);
const setStmt = db.query<null, [string, string, number]>(
	"INSERT OR REPLACE INTO tweet_cache (id, json, fetched_at) VALUES (?, ?, ?)",
);

export function getCached(id: string): FxTwitterResponse | null {
	const row = getStmt.get(id);
	if (!row) return null;
	try {
		return JSON.parse(row.json) as FxTwitterResponse;
	} catch {
		return null;
	}
}

export function setCached(id: string, value: FxTwitterResponse): void {
	setStmt.run(id, JSON.stringify(value), Date.now());
}

export { db as cacheDb };
