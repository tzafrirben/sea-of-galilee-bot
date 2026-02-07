import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { TwitterApi } from "twitter-api-v2";
import { logger } from "./logger.js";
import { findNewRecords, formatTweet } from "./tweet-utils.js";
import type { SurveyRecord } from "./types.js";

async function main() {
	const surveysFile = process.argv[2] || "docs/surveys.json";
	const lastTweetFile = process.argv[3] || "last_tweet.txt";
	const upperRedLineStr = process.env.UPPER_RED_LINE;

	// Twitter Credentials
	const appKey = process.env.TWITTER_APP_KEY;
	const appSecret = process.env.TWITTER_APP_SECRET;
	const accessToken = process.env.TWITTER_ACCESS_TOKEN;
	const accessSecret = process.env.TWITTER_ACCESS_SECRET;

	if (!upperRedLineStr) {
		logger.error("Error: UPPER_RED_LINE environment variable is not set.");
		process.exit(1);
	}

	const upperRedLine = Number(upperRedLineStr);
	if (Number.isNaN(upperRedLine)) {
		logger.error("Error: UPPER_RED_LINE is not a valid number.");
		process.exit(1);
	}

	const resolvedSurveysPath = path.resolve(surveysFile);
	const resolvedLastTweetPath = path.resolve(lastTweetFile);

	// Load State
	let surveys: SurveyRecord[] = [];
	try {
		const fileContent = await fs.readFile(resolvedSurveysPath, "utf-8");
		surveys = JSON.parse(fileContent);
	} catch (error) {
		logger.error({ err: error }, `Error reading surveys file: ${error}`);
		process.exit(1);
	}

	let lastTweetDateStr = "";
	try {
		lastTweetDateStr = (
			await fs.readFile(resolvedLastTweetPath, "utf-8")
		).trim();
	} catch (_error) {
		// If file doesn't exist, assume empty or very old date
	}

	// Find New Data
	const newRecords = findNewRecords(surveys, lastTweetDateStr);

	if (newRecords.length === 0) {
		logger.info("No new records to tweet.");
		process.exit(0);
	}

	const latestRecord = newRecords[0];

	// Format Tweet using helper
	const tweetText = formatTweet(latestRecord, upperRedLine);

	logger.info({ tweetText }, "Generated tweet text.");

	// Send Tweet
	if (!appKey || !appSecret || !accessToken || !accessSecret) {
		logger.error(
			"Missing Twitter API credentials. Cannot send tweet. (TWITTER_APP_KEY, TWITTER_APP_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET)",
		);
		process.exit(1);
	}

	const client = new TwitterApi({
		appKey,
		appSecret,
		accessToken,
		accessSecret,
	});

	try {
		const rwClient = client.readWrite;
		await rwClient.v2.tweet(tweetText);
		logger.info("Tweet sent successfully.");

		// Update State ONLY after successful tweet
		await fs.writeFile(resolvedLastTweetPath, latestRecord.date);
	} catch (error) {
		logger.error({ err: error }, "Failed to send tweet.");
		process.exit(1);
	}
}

main().catch((err) => {
	logger.fatal({ err }, "Unhandled exception");
	process.exit(1);
});
