import { env } from "./env";

export type FxTwitterAuthor = {
	screen_name: string;
	name: string;
	id: string;
	url?: string;
	avatar_url?: string;
	banner_url?: string | null;
	description?: string;
	followers?: number;
	following?: number;
	joined?: string;
	location?: string;
};

export type FxTwitterPhoto = {
	type: "photo";
	url: string;
	width?: number;
	height?: number;
	id?: string;
};

export type FxTwitterVideo = {
	type: "video" | "gif";
	url: string;
	thumbnail_url?: string;
	width?: number;
	height?: number;
	duration?: number;
	format?: string;
	id?: string;
};

export type FxTwitterMediaItem = FxTwitterPhoto | FxTwitterVideo;

export type FxTwitterMedia = {
	all?: FxTwitterMediaItem[];
	photos?: FxTwitterPhoto[];
	videos?: FxTwitterVideo[];
	mosaic?: { type: string; formats: Record<string, string> } | null;
};

export type FxTwitterArticle = {
	title?: string;
	preview_image_url?: string | null;
	cover_media?: { url?: string } | null;
	text?: string;
};

export type FxTwitterQuote = FxTwitterTweetCore & { replying_to_status?: null };

export type FxTwitterReplyingTo = {
	screen_name?: string;
	post?: string;
};

type FxTwitterTweetCore = {
	url: string;
	id: string;
	text: string;
	raw_text?: { text: string; display_text_range?: [number, number] };
	author: FxTwitterAuthor;
	created_at: string;
	created_timestamp?: number;
	replies?: number;
	retweets?: number;
	reposts?: number;
	likes?: number;
	bookmarks?: number;
	quotes?: number;
	views?: number | null;
	lang?: string;
	source?: string;
	is_note_tweet?: boolean;
	media?: FxTwitterMedia | null;
	quote?: FxTwitterQuote | null;
	article?: FxTwitterArticle | null;
	replying_to?: FxTwitterReplyingTo | null;
};

export type FxTwitterTweet = FxTwitterTweetCore & {
	replying_to_status?: FxTwitterTweet | null;
};

// The /i/status endpoint returns the legacy shape: { code, message, tweet }.
export type FxTwitterResponse = {
	code: number;
	message?: string;
	tweet: FxTwitterTweet;
};

export type FxTwitterTombstone = {
	tombstone: { text?: string; reason?: string };
};
export type FxTwitterReply = FxTwitterTweet | FxTwitterTombstone;
export const isTombstone = (r: FxTwitterReply): r is FxTwitterTombstone =>
	"tombstone" in r;

export type FxTwitterConversationResponse = {
	code: number;
	message?: string;
	status: FxTwitterTweet;
	thread?: FxTwitterReply[];
	replies: FxTwitterReply[];
	author?: FxTwitterAuthor;
	cursor?: { bottom?: string | null };
};

export class FxTwitterError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message);
		this.name = "FxTwitterError";
	}
}

export async function fetchTweet(id: string): Promise<FxTwitterResponse> {
	const res = await fetch(`https://api.fxtwitter.com/i/status/${id}`, {
		headers: {
			"User-Agent": env.USER_AGENT,
			Accept: "application/json",
		},
	});

	if (res.status === 404) {
		throw new FxTwitterError(404, "Tweet not found");
	}
	if (!res.ok) {
		throw new FxTwitterError(
			res.status,
			`FxTwitter responded with ${res.status}`,
		);
	}

	const body = (await res.json()) as FxTwitterResponse;
	if (!body.tweet) {
		throw new FxTwitterError(502, "FxTwitter returned no tweet payload");
	}
	return body;
}

// Comments are dynamic (rankings shift, new replies arrive), so we don't reuse
// the immutable tweet_cache SQLite store. A tiny in-memory TTL map is enough
// to absorb spam-clicks of "Load more" without hammering FxTwitter.
const convCache = new Map<
	string,
	{ at: number; value: FxTwitterConversationResponse }
>();
const CONV_TTL_MS = 60_000;

export async function fetchConversation(
	id: string,
	cursor?: string,
): Promise<FxTwitterConversationResponse> {
	const key = `${id}:${cursor ?? ""}`;
	const hit = convCache.get(key);
	if (hit && Date.now() - hit.at < CONV_TTL_MS) return hit.value;

	const url = new URL(`https://api.fxtwitter.com/2/conversation/${id}`);
	if (cursor) url.searchParams.set("cursor", cursor);
	const res = await fetch(url, {
		headers: {
			"User-Agent": env.USER_AGENT,
			Accept: "application/json",
		},
	});

	if (res.status === 404) {
		throw new FxTwitterError(404, "Tweet not found");
	}
	if (!res.ok) {
		throw new FxTwitterError(
			res.status,
			`FxTwitter responded with ${res.status}`,
		);
	}

	const body = (await res.json()) as FxTwitterConversationResponse;
	if (!body?.status) {
		throw new FxTwitterError(502, "FxTwitter returned no parent status");
	}
	if (!Array.isArray(body.replies)) body.replies = [];
	convCache.set(key, { at: Date.now(), value: body });
	return body;
}
