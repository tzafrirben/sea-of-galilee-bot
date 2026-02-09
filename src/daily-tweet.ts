import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Ajv from "ajv";
import { TwitterApi } from "twitter-api-v2";
import { generateTweetWithLLM } from "./llm-tweet-generator.js";
import { logger } from "./logger.js";
import { analyzeTrends } from "./trend-analyzer.js";
import { findNewRecords, formatTweet } from "./tweet-utils.js";
import type { SurveyRecord } from "./types.js";

const ajv = new Ajv({ coerceTypes: true, useDefaults: true });

const envSchema = {
	type: "object",
	properties: {
		UPPER_RED_LINE: { type: "number" },
		LOWER_RED_LINE: { type: "number" },
		BLACK_LINE: { type: "number" },
		TWITTER_APP_KEY: { type: "string", minLength: 1 },
		TWITTER_APP_SECRET: { type: "string", minLength: 1 },
		TWITTER_ACCESS_TOKEN: { type: "string", minLength: 1 },
		TWITTER_ACCESS_SECRET: { type: "string", minLength: 1 },
		DRY_RUN: { type: "boolean", default: false },
		GEMINI_API_KEY: { type: "string" },
		GEMINI_MODEL: {
			type: "string",
			default: "gemini-2.0-flash",
		},
		USE_LLM_GENERATION: { type: "boolean", default: true },
		MAX_TWEET_LENGTH: { type: "number", default: 280 },
	},
	required: [
		"UPPER_RED_LINE",
		"LOWER_RED_LINE",
		"BLACK_LINE",
		"TWITTER_APP_KEY",
		"TWITTER_APP_SECRET",
		"TWITTER_ACCESS_TOKEN",
		"TWITTER_ACCESS_SECRET",
	],
};

async function main() {
	const surveysFile = process.argv[2] || "docs/surveys.json";
	const lastTweetFile = process.argv[3] || "last_tweet.txt";

	const validate = ajv.compile(envSchema);
	const env = {
		UPPER_RED_LINE: process.env.UPPER_RED_LINE,
		LOWER_RED_LINE: process.env.LOWER_RED_LINE,
		BLACK_LINE: process.env.BLACK_LINE,
		TWITTER_APP_KEY: process.env.TWITTER_APP_KEY,
		TWITTER_APP_SECRET: process.env.TWITTER_APP_SECRET,
		TWITTER_ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN,
		TWITTER_ACCESS_SECRET: process.env.TWITTER_ACCESS_SECRET,
		DRY_RUN: process.env.DRY_RUN,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
		GEMINI_MODEL: process.env.GEMINI_MODEL,
		USE_LLM_GENERATION: process.env.USE_LLM_GENERATION,
		MAX_TWEET_LENGTH: process.env.MAX_TWEET_LENGTH,
	};

	if (!validate(env)) {
		logger.error({ errors: validate.errors }, "Environment validation failed");
		process.exit(1);
	}

	// Now env is typed correctly (mostly) and validated
	// We need to cast it or trust it.
	const {
		UPPER_RED_LINE: upperRedLine,
		LOWER_RED_LINE: lowerRedLine,
		BLACK_LINE: blackLine,
		TWITTER_APP_KEY: appKey,
		TWITTER_APP_SECRET: appSecret,
		TWITTER_ACCESS_TOKEN: accessToken,
		TWITTER_ACCESS_SECRET: accessSecret,
		DRY_RUN: dryRun,
		GEMINI_API_KEY: geminiApiKey,
		GEMINI_MODEL: geminiModel,
		USE_LLM_GENERATION: useLlmGeneration,
		MAX_TWEET_LENGTH: maxTweetLength,
	} = env as unknown as {
		UPPER_RED_LINE: number;
		LOWER_RED_LINE: number;
		BLACK_LINE: number;
		TWITTER_APP_KEY: string;
		TWITTER_APP_SECRET: string;
		TWITTER_ACCESS_TOKEN: string;
		TWITTER_ACCESS_SECRET: string;
		DRY_RUN: boolean;
		GEMINI_API_KEY: string | undefined;
		GEMINI_MODEL: string;
		USE_LLM_GENERATION: boolean;
		MAX_TWEET_LENGTH: number;
	};

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

	// Generate Tweet (with LLM or fallback to template)
	let tweetText: string;

	if (useLlmGeneration && geminiApiKey) {
		try {
			logger.info("Generating tweet with LLM (Gemini)...");

			const trends = analyzeTrends(surveys, latestRecord, {
				upperRedLine,
				lowerRedLine,
				blackLine,
			});

			tweetText = await generateTweetWithLLM(latestRecord, trends, {
				apiKey: geminiApiKey,
				model: geminiModel,
				temperature: 0.7,
				maxTweetLength,
			});

			logger.info(
				{ tweetText, source: "gemini" },
				"Generated tweet with Gemini",
			);
		} catch (error) {
			logger.warn(
				{ err: error },
				"LLM generation failed, falling back to template",
			);
			tweetText = formatTweet(latestRecord, upperRedLine);
			logger.info(
				{ tweetText, source: "template" },
				"Generated tweet with template",
			);
		}
	} else {
		logger.info("Using template-based generation");
		tweetText = formatTweet(latestRecord, upperRedLine);
		logger.info({ tweetText, source: "template" }, "Generated tweet text.");
	}

	if (dryRun) {
		logger.info("DRY_RUN=true: Skipping tweet sending and state update.");
		return;
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
