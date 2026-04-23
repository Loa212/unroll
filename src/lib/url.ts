const TWEET_URL_PATTERNS: RegExp[] = [
	/^https?:\/\/(?:www\.|mobile\.)?(?:twitter|x)\.com\/[^/]+\/status(?:es)?\/(\d+)/i,
	/^https?:\/\/(?:www\.)?(?:twitter|x)\.com\/i\/(?:web\/)?status\/(\d+)/i,
];

const ID_ONLY = /^\d{5,25}$/;

export function extractTweetId(input: string): string | null {
	const trimmed = input.trim();
	if (ID_ONLY.test(trimmed)) return trimmed;

	for (const pattern of TWEET_URL_PATTERNS) {
		const match = trimmed.match(pattern);
		if (match?.[1]) return match[1];
	}

	try {
		const url = new URL(trimmed);
		const host = url.hostname.replace(/^www\.|^mobile\./, "");
		if (host !== "x.com" && host !== "twitter.com") return null;
		const parts = url.pathname.split("/").filter(Boolean);
		const statusIdx = parts.findIndex(
			(p) => p === "status" || p === "statuses",
		);
		if (statusIdx !== -1) {
			const id = parts[statusIdx + 1];
			if (id && ID_ONLY.test(id)) return id;
		}
	} catch {
		/* not a URL */
	}

	return null;
}

export function tweetUrl(handle: string, id: string): string {
	return `https://x.com/${handle}/status/${id}`;
}
