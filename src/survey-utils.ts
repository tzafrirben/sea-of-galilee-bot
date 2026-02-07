import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { format, isFuture, parse } from "date-fns";
import type { ApiResponse, SurveyRecord } from "./types.js";

// Helper interface for the raw API record structure
export interface ApiRecord {
	Survey_Date: string;
	Kinneret_Level: number | string;
	_id: number;
}

const ajv = new Ajv();
addFormats(ajv);

const schema = {
	type: "object",
	properties: {
		success: { type: "boolean" },
		result: {
			type: "object",
			properties: {
				records: {
					type: "array",
					items: {
						type: "object",
						properties: {
							Survey_Date: { type: "string" },
							Kinneret_Level: { type: ["number", "string"] },
							_id: { type: "number" },
						},
						required: ["Survey_Date", "Kinneret_Level", "_id"],
					},
				},
			},
			required: ["records"],
		},
	},
	required: ["success", "result"],
};

const validate = ajv.compile<ApiResponse>(schema);

export function validateApiResponse(
	data: unknown,
): { valid: boolean; errors?: ErrorObject[] | null } {
	const valid = validate(data);
	return { valid, errors: validate.errors };
}

export function processRecords(
	fetchedRecords: ApiRecord[],
	existingHistory: SurveyRecord[],
): { mergedRecords: SurveyRecord[]; newCount: number } {
	// Parse and normalize fetched records
	const normalizedRecords = fetchedRecords.map((record) => {
		// Format seems to be d/M/yyyy based on inspection
		const dateObj = parse(record.Survey_Date, "d/M/yyyy", new Date());
		const dateStr = format(dateObj, "yyyy-MM-dd");
		const level = Number(record.Kinneret_Level);

		return {
			date: dateStr,
			level: level,
			originalDate: dateObj,
		};
	});

	// Filter out future dates and invalid numbers
	const validNewRecords: SurveyRecord[] = normalizedRecords
		.filter((r) => !isFuture(r.originalDate) && !Number.isNaN(r.level))
		.map((r) => ({ date: r.date, level: r.level }));

	// Deduplicate
	const historyMap = new Map(existingHistory.map((r) => [r.date, r]));
	let newCount = 0;

	for (const record of validNewRecords) {
		if (!historyMap.has(record.date)) {
			historyMap.set(record.date, record);
			newCount++;
		}
	}

	const mergedRecords = Array.from(historyMap.values());

	// Sort descending
	mergedRecords.sort((a, b) => {
		return new Date(b.date).getTime() - new Date(a.date).getTime();
	});

	return { mergedRecords, newCount };
}
