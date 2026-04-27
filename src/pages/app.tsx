import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import type { FxTwitterTweet } from "../lib/fxtwitter";
import { commentsToMarkdown } from "../lib/markdown";

type RateInfo = {
	limit: number;
	remaining: number;
	reset: number;
};

type Format = "markdown" | "json";

type ThreadResult = {
	content?: string;
	tweets?: unknown[];
	tweetCount?: number;
	count?: number;
	author?: { screen_name?: string; name?: string };
};

type CommentsState = {
	parent: FxTwitterTweet;
	replies: FxTwitterTweet[];
	cursor: string | null;
};

function useRateInfo() {
	const [info, setInfo] = useState<RateInfo | null>(null);
	const captureFromHeaders = (h: Headers) => {
		const limit = Number(h.get("ratelimit-limit"));
		const remaining = Number(h.get("ratelimit-remaining"));
		const reset = Number(h.get("ratelimit-reset"));
		if (Number.isFinite(limit) && Number.isFinite(remaining)) {
			setInfo({ limit, remaining, reset });
		}
	};
	return { info, captureFromHeaders };
}

function RateIndicator({ info }: { info: RateInfo | null }) {
	if (!info) return null;
	const pct = info.remaining / info.limit;
	const cls = pct === 0 ? "empty" : pct < 0.2 ? "low" : "";
	const resetIn = Math.max(0, info.reset * 1000 - Date.now());
	const mins = Math.ceil(resetIn / 60_000);
	return (
		<span class={`rate-indicator ${cls}`} title={`Resets in ~${mins}m`}>
			<span class="dot" />
			{info.remaining}/{info.limit}
		</span>
	);
}

function CopyIcon() {
	return (
		<svg
			class="icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<rect x="9" y="9" width="13" height="13" rx="2" />
			<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
		</svg>
	);
}

function DownloadIcon() {
	return (
		<svg
			class="icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
			<polyline points="7 10 12 15 17 10" />
			<line x1="12" y1="15" x2="12" y2="3" />
		</svg>
	);
}

function GithubIcon() {
	return (
		<svg
			class="icon"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.58.1.78-.25.78-.56v-2.1c-3.2.7-3.87-1.37-3.87-1.37-.53-1.35-1.3-1.7-1.3-1.7-1.06-.73.08-.72.08-.72 1.17.08 1.79 1.2 1.79 1.2 1.04 1.78 2.73 1.27 3.4.97.1-.75.4-1.27.74-1.56-2.55-.3-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.48.11-3.08 0 0 .97-.31 3.18 1.18.92-.26 1.9-.39 2.88-.39s1.96.13 2.88.39c2.21-1.49 3.18-1.18 3.18-1.18.63 1.6.23 2.78.11 3.08.75.81 1.2 1.84 1.2 3.1 0 4.42-2.69 5.38-5.25 5.67.41.36.77 1.06.77 2.14v3.18c0 .31.2.67.79.55C20.21 21.37 23.5 17.08 23.5 12 23.5 5.73 18.27.5 12 .5z" />
		</svg>
	);
}

function App() {
	const [url, setUrl] = useState("");
	const [format, setFormat] = useState<Format>("markdown");
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<ThreadResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [commentsResult, setCommentsResult] = useState<CommentsState | null>(
		null,
	);
	const [commentsLoading, setCommentsLoading] = useState(false);
	const [commentsLoadingMore, setCommentsLoadingMore] = useState(false);
	const [commentsError, setCommentsError] = useState<string | null>(null);
	const [commentsFormat, setCommentsFormat] = useState<Format>("markdown");
	const [commentsCopied, setCommentsCopied] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const { info: rate, captureFromHeaders } = useRateInfo();

	useEffect(() => {
		inputRef.current?.focus();
		const q = new URLSearchParams(window.location.search).get("q");
		if (q?.trim()) {
			setUrl(q);
			void submit(undefined, undefined, q);
		}
	}, []);

	const submit = async (
		e?: Event,
		overrideFormat?: Format,
		overrideUrl?: string,
	) => {
		e?.preventDefault();
		const trimmed = (overrideUrl ?? url).trim();
		if (!trimmed) return;
		const activeFormat = overrideFormat ?? format;

		// Reflect the search in the URL so results are shareable / bookmarkable.
		const qs = new URLSearchParams({ q: trimmed }).toString();
		if (window.location.search !== `?${qs}`) {
			window.history.replaceState(null, "", `/?${qs}`);
		}

		setLoading(true);
		setError(null);
		setResult(null);
		setCopied(false);
		setCommentsResult(null);
		setCommentsError(null);
		setCommentsCopied(false);

		try {
			const params = new URLSearchParams({
				url: trimmed,
				format: activeFormat,
			});
			const res = await fetch(`/api/thread?${params.toString()}`, {
				headers: { Accept: "application/json" },
			});
			captureFromHeaders(res.headers);

			if (res.status === 429) {
				setError(
					"Rate limited. Try again in a bit, or self-host for your own limits.",
				);
				return;
			}
			if (!res.ok) {
				let message = `Request failed (${res.status})`;
				try {
					const body = (await res.json()) as { error?: string };
					if (body.error === "invalid_tweet_url") {
						message = "That doesn't look like a tweet URL.";
					} else if (res.status === 404) {
						message = "Tweet not found (or the account is protected).";
					} else if (body.error) {
						message = body.error;
					}
				} catch {
					/* non-JSON body */
				}
				setError(message);
				return;
			}

			const body = (await res.json()) as ThreadResult;
			setResult(body);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Network error. Try again.",
			);
		} finally {
			setLoading(false);
		}
	};

	const outputText = (() => {
		if (!result) return "";
		if (format === "markdown") return result.content ?? "";
		return JSON.stringify(result, null, 2);
	})();

	const handle = result?.author?.screen_name;
	const tweetCount = result?.tweetCount ?? result?.count ?? 0;

	const copy = async () => {
		if (!outputText) return;
		try {
			await navigator.clipboard.writeText(outputText);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			setError("Copy failed — your browser blocked clipboard access.");
		}
	};

	const download = () => {
		if (!outputText) return;
		const ext = format === "markdown" ? "md" : "json";
		const mime = format === "markdown" ? "text/markdown" : "application/json";
		const fileName = handle ? `thread-${handle}.${ext}` : `thread.${ext}`;
		const blob = new Blob([outputText], { type: mime });
		const href = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = href;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(href);
	};

	const loadComments = async (cursor?: string) => {
		const trimmed = url.trim();
		if (!trimmed) return;
		if (cursor) setCommentsLoadingMore(true);
		else setCommentsLoading(true);
		setCommentsError(null);
		try {
			const params = new URLSearchParams({ url: trimmed, format: "json" });
			if (cursor) params.set("cursor", cursor);
			const res = await fetch(`/api/comments?${params.toString()}`, {
				headers: { Accept: "application/json" },
			});
			captureFromHeaders(res.headers);

			if (res.status === 429) {
				setCommentsError(
					"Rate limited. Try again in a bit, or self-host for your own limits.",
				);
				return;
			}
			if (!res.ok) {
				let message = `Request failed (${res.status})`;
				try {
					const body = (await res.json()) as { error?: string };
					if (body.error === "invalid_tweet_url") {
						message = "That doesn't look like a tweet URL.";
					} else if (res.status === 404) {
						message = "Tweet not found (or the account is protected).";
					} else if (body.error) {
						message = body.error;
					}
				} catch {
					/* non-JSON body */
				}
				setCommentsError(message);
				return;
			}

			const body = (await res.json()) as {
				parent: FxTwitterTweet;
				replies: FxTwitterTweet[];
				count: number;
				cursor: string | null;
			};
			setCommentsResult((prev) =>
				prev && cursor
					? {
							parent: prev.parent,
							replies: [...prev.replies, ...body.replies],
							cursor: body.cursor,
						}
					: {
							parent: body.parent,
							replies: body.replies,
							cursor: body.cursor,
						},
			);
			setCommentsCopied(false);
		} catch (err) {
			setCommentsError(
				err instanceof Error ? err.message : "Network error. Try again.",
			);
		} finally {
			setCommentsLoading(false);
			setCommentsLoadingMore(false);
		}
	};

	const commentsOutputText = (() => {
		if (!commentsResult) return "";
		if (commentsFormat === "markdown")
			return commentsToMarkdown(commentsResult.parent, commentsResult.replies);
		return JSON.stringify(
			{
				parent: commentsResult.parent,
				replies: commentsResult.replies,
				count: commentsResult.replies.length,
				cursor: commentsResult.cursor,
			},
			null,
			2,
		);
	})();

	const commentsHandle = commentsResult?.parent.author.screen_name;
	const replyCount = commentsResult?.replies.length ?? 0;

	const copyComments = async () => {
		if (!commentsOutputText) return;
		try {
			await navigator.clipboard.writeText(commentsOutputText);
			setCommentsCopied(true);
			setTimeout(() => setCommentsCopied(false), 1500);
		} catch {
			setCommentsError("Copy failed — your browser blocked clipboard access.");
		}
	};

	const downloadComments = () => {
		if (!commentsOutputText) return;
		const ext = commentsFormat === "markdown" ? "md" : "json";
		const mime =
			commentsFormat === "markdown" ? "text/markdown" : "application/json";
		const fileName = commentsHandle
			? `comments-${commentsHandle}.${ext}`
			: `comments.${ext}`;
		const blob = new Blob([commentsOutputText], { type: mime });
		const href = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = href;
		a.download = fileName;
		a.click();
		URL.revokeObjectURL(href);
	};

	return (
		<div class="page">
			<header class="topbar">
				<div class="brand">
					un<span>roll</span>
				</div>
				<div class="topbar-links">
					<a
						class="pill"
						href="https://github.com/Loa212/unroll"
						target="_blank"
						rel="noreferrer"
					>
						<GithubIcon /> Source
					</a>
				</div>
			</header>

			<section class="hero">
				<h1>
					Threads to <span class="accent">Markdown</span>
				</h1>
				<p>
					Paste any X/Twitter URL. We walk the reply chain, convert the whole
					thread to clean markdown, and hand it back. Powered by the public{" "}
					<a
						href="https://github.com/FxEmbed/FxEmbed"
						target="_blank"
						rel="noreferrer"
					>
						FxTwitter
					</a>{" "}
					API — no login, no key.
				</p>
				<div class="stats">
					<span class="pill accent">no signup</span>
					<span class="pill">markdown or json</span>
					<span class="pill">immutable cache</span>
				</div>
			</section>

			<form class="card" onSubmit={submit}>
				<div class="input-row">
					<input
						ref={inputRef}
						type="url"
						placeholder="Paste any tweet or thread URL (e.g. https://x.com/jack/status/20)"
						value={url}
						onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
						disabled={loading}
						autocomplete="off"
					/>
					<button type="submit" disabled={loading || !url.trim()}>
						{loading ? <span class="spinner" /> : "Unroll"}
					</button>
				</div>
			</form>

			<div class="tip">
				or prepend{" "}
				<code>
					{window.location.host}/<span class="accent-path">any-tweet-url</span>
				</code>{" "}
				to any tweet URL in your browser
			</div>

			{error && <div class="error">{error}</div>}

			{result && (
				<div class="result">
					<div class="result-header">
						<div class="result-meta">
							{handle && (
								<span>
									<strong>@{handle}</strong> · {tweetCount} tweet
									{tweetCount === 1 ? "" : "s"}
								</span>
							)}
							<RateIndicator info={rate} />
						</div>
						<div class="result-actions">
							<div class="segmented">
								<button
									type="button"
									class={format === "markdown" ? "active" : ""}
									onClick={() => {
										setFormat("markdown");
										if (url.trim()) submit(undefined, "markdown");
									}}
								>
									Markdown
								</button>
								<button
									type="button"
									class={format === "json" ? "active" : ""}
									onClick={() => {
										setFormat("json");
										if (url.trim()) submit(undefined, "json");
									}}
								>
									JSON
								</button>
							</div>
							<button class="ghost" type="button" onClick={copy}>
								<CopyIcon /> {copied ? "Copied" : "Copy"}
							</button>
							<button class="ghost" type="button" onClick={download}>
								<DownloadIcon /> Download
							</button>
						</div>
					</div>
					<pre class="output">{outputText}</pre>

					{!commentsResult && !commentsLoading && !commentsError && (
						<div
							class="result-actions"
							style={{ justifyContent: "center", marginTop: 16 }}
						>
							<button type="button" onClick={() => loadComments()}>
								Load comments
							</button>
						</div>
					)}
					{commentsLoading && (
						<div style={{ textAlign: "center", marginTop: 16 }}>
							<span class="spinner" />
						</div>
					)}
					{commentsError && <div class="error">{commentsError}</div>}
					{commentsResult && (
						<div class="result" style={{ marginTop: 16 }}>
							<div class="result-header">
								<div class="result-meta">
									{commentsHandle && (
										<span>
											Replies to <strong>@{commentsHandle}</strong> ·{" "}
											{replyCount} repl{replyCount === 1 ? "y" : "ies"}
										</span>
									)}
								</div>
								<div class="result-actions">
									<div class="segmented">
										<button
											type="button"
											class={commentsFormat === "markdown" ? "active" : ""}
											onClick={() => setCommentsFormat("markdown")}
										>
											Markdown
										</button>
										<button
											type="button"
											class={commentsFormat === "json" ? "active" : ""}
											onClick={() => setCommentsFormat("json")}
										>
											JSON
										</button>
									</div>
									<button class="ghost" type="button" onClick={copyComments}>
										<CopyIcon /> {commentsCopied ? "Copied" : "Copy"}
									</button>
									<button
										class="ghost"
										type="button"
										onClick={downloadComments}
									>
										<DownloadIcon /> Download
									</button>
								</div>
							</div>
							<pre class="output">{commentsOutputText}</pre>
							{commentsResult.cursor && (
								<div
									class="result-actions"
									style={{ justifyContent: "center", marginTop: 12 }}
								>
									<button
										type="button"
										disabled={commentsLoadingMore}
										onClick={() =>
											commentsResult.cursor &&
											loadComments(commentsResult.cursor)
										}
									>
										{commentsLoadingMore ? (
											<span class="spinner" />
										) : (
											"Load more"
										)}
									</button>
								</div>
							)}
						</div>
					)}
				</div>
			)}

			{!result && !error && (
				<div style={{ textAlign: "center", marginTop: 40 }}>
					<RateIndicator info={rate} />
				</div>
			)}

			<footer>
				Built on{" "}
				<a
					href="https://github.com/FxEmbed/FxEmbed"
					target="_blank"
					rel="noreferrer"
				>
					FxTwitter
				</a>
				. No credentials stored. Tweet data is immutable and cached locally.
			</footer>
		</div>
	);
}

const root = document.getElementById("app");
if (root) render(<App />, root);
