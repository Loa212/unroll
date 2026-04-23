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
