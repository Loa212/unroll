import { getCached, setCached } from "./cache";
import {
	FxTwitterError,
	type FxTwitterTweet,
	fetchConversation,
	fetchTweet,
	isTombstone,
} from "./fxtwitter";
import { extractTweetId } from "./url";

async function getTweetCached(id: string): Promise<FxTwitterTweet> {
	const cached = getCached(id);
	if (cached) return cached.tweet;
	const fresh = await fetchTweet(id);
	setCached(id, fresh);
	return fresh.tweet;
}

export async function unrollThread(url: string): Promise<FxTwitterTweet[]> {
	const id = extractTweetId(url);
	if (!id) throw new Error("invalid_tweet_url");

	const leaf = await getTweetCached(id);
	const chain: FxTwitterTweet[] = [leaf];

	let current: FxTwitterTweet = leaf;
	const seen = new Set<string>([leaf.id]);

	while (current.replying_to_status) {
		const parent = current.replying_to_status;
		if (parent.author.id !== leaf.author.id) break;
		if (seen.has(parent.id)) break;
		seen.add(parent.id);
		// Parent may already be populated inline by fxtwitter; re-fetch to ensure
		// we have its own replying_to_status link for continued walking.
		const hydrated = await getTweetCached(parent.id);
		chain.push(hydrated);
		current = hydrated;
	}

	return chain.reverse();
}

export async function fetchSingle(url: string): Promise<FxTwitterTweet> {
	const id = extractTweetId(url);
	if (!id) throw new Error("invalid_tweet_url");
	return getTweetCached(id);
}

export type CommentsResult = {
	parent: FxTwitterTweet;
	replies: FxTwitterTweet[];
	cursor: string | null;
};

export async function fetchComments(
	url: string,
	cursor?: string,
): Promise<CommentsResult> {
	const id = extractTweetId(url);
	if (!id) throw new Error("invalid_tweet_url");
	let conv: Awaited<ReturnType<typeof fetchConversation>>;
	try {
		conv = await fetchConversation(id, cursor);
	} catch (err) {
		// FxTwitter sometimes hands out a `cursor.bottom` on the last page that
		// 404s on the next request. Treat that as "no more pages" rather than an
		// error, but only when the caller actually passed a cursor — without one,
		// 404 means the parent tweet itself is gone.
		if (cursor && err instanceof FxTwitterError && err.status === 404) {
			const parentTweet = await fetchTweet(id);
			return { parent: parentTweet.tweet, replies: [], cursor: null };
		}
		throw err;
	}
	const replies = (conv.replies ?? []).filter(
		(r): r is FxTwitterTweet => !isTombstone(r),
	);
	return { parent: conv.status, replies, cursor: conv.cursor?.bottom ?? null };
}
