import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { request } from "undici";
import { logger } from "./logger.js";
import { processRecords, validateApiResponse } from "./survey-utils.js";
import type { SurveyRecord } from "./types.js";

const API_URL = "https://data.gov.il/api/3/action/datastore_search";
const RESOURCE_ID = "2de7b543-e13d-4e7e-b4c8-56071bc4d3c8";
const LIMIT = 15;

async function main() {
	const outputFile = process.argv[2] || "docs/surveys.json";
	const resolvedOutputPath = path.resolve(outputFile);

	logger.info("Fetching data...");
	const { body } = await request(API_URL, {
		query: {
			resource_id: RESOURCE_ID,
			limit: LIMIT,
		},
	});

	const data = await body.json();

	const validationResult = validateApiResponse(data);

	if (!validationResult.valid) {
		logger.error(
			{ errors: validationResult.errors },
			"Invalid API response structure",
		);
		process.exit(1);
	}

	// At this point we know data matches ApiResponse structure
	// biome-ignore lint/suspicious/noExplicitAny: validated above
	const apiData = data as any;

	if (!apiData.success) {
		logger.error("API response indicated failure");
		process.exit(1);
	}

	// Load existing history
	let history: SurveyRecord[] = [];
	try {
		const fileContent = await fs.readFile(resolvedOutputPath, "utf-8");
		history = JSON.parse(fileContent);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
			throw error;
		}
		// If file doesn't exist, history is empty array
	}

	// Process records using helper
	const { mergedRecords, newCount } = processRecords(
		apiData.result.records,
		history,
	);

	// Write back
	await fs.writeFile(resolvedOutputPath, JSON.stringify(mergedRecords));

	logger.info(
		{ outputFile, newCount },
		`Updated ${outputFile}. Found ${newCount} new records.`,
	);
}

main().catch((err) => {
	logger.fatal({ err }, "Unhandled exception");
	process.exit(1);
});
