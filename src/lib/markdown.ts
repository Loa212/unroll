import type {
	FxTwitterMediaItem,
	FxTwitterQuote,
	FxTwitterTweet,
} from "./fxtwitter";

function formatDate(input: string): string {
	const d = new Date(input);
	if (Number.isNaN(d.getTime())) return input;
	return d.toISOString().replace("T", " ").replace(/\..+$/, "Z");
}

function mediaToMarkdown(items: FxTwitterMediaItem[] | undefined): string {
	if (!items || items.length === 0) return "";
	return items
		.map((m) => {
			if (m.type === "photo") return `![](${m.url})`;
			return `[video](${m.url})`;
		})
		.join("\n");
}

function tweetBody(tweet: FxTwitterTweet): string {
	// Prefer raw_text when available (preserves full-text before t.co shortening)
	// but fall back to text. For note tweets / articles we want the full body.
	if (tweet.is_note_tweet && tweet.raw_text?.text) return tweet.raw_text.text;
	if (tweet.article?.text) return tweet.article.text;
	return tweet.raw_text?.text ?? tweet.text;
}

function quoteBlock(quote: FxTwitterQuote): string {
	const body = tweetBody(quote as FxTwitterTweet)
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");
	return `> **@${quote.author.screen_name}:**\n${body}`;
}

function tweetToSection(tweet: FxTwitterTweet): string {
	const parts: string[] = [];
	parts.push(tweetBody(tweet));

	if (tweet.article) {
		if (tweet.article.title) {
			parts.unshift(`**${tweet.article.title}**`);
		}
	}

	const media = mediaToMarkdown(tweet.media?.all);
	if (media) parts.push(media);

	if (tweet.quote) parts.push(quoteBlock(tweet.quote));

	parts.push(`[link](${tweet.url})`);

	return parts.join("\n\n");
}

export function threadToMarkdown(tweets: FxTwitterTweet[]): string {
	if (tweets.length === 0) return "";
	const first = tweets[0];
	if (!first) return "";

	const author = first.author;
	const header = [
		`# Thread by @${author.screen_name}`,
		"",
		`**${author.name}** · ${formatDate(first.created_at)}`,
		"",
		`Source: [${first.url}](${first.url})`,
		"",
		`${tweets.length} tweet${tweets.length === 1 ? "" : "s"}`,
		"",
		"---",
		"",
	].join("\n");

	const body = tweets.map(tweetToSection).join("\n\n---\n\n");

	return `${header}${body}\n`;
}

export function singleTweetToMarkdown(tweet: FxTwitterTweet): string {
	return threadToMarkdown([tweet]);
}
