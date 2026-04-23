import { getCached, setCached } from "./cache";
import { fetchTweet, type FxTwitterTweet } from "./fxtwitter";
import { extractTweetId } from "./url";

async function getTweetCached(id: string): Promise<FxTwitterTweet> {
	const cached = getCached(id);
	if (cached) return cached.tweet;
	const fresh = await fetchTweet(id);
	setCached(id, fresh);
	return fresh.tweet;
}

export async function unrollThread(
	url: string,
): Promise<FxTwitterTweet[]> {
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
