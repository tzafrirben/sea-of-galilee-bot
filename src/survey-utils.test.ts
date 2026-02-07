import { describe, it, type TestContext } from "node:test";
import {
	type ApiRecord,
	processRecords,
	validateApiResponse,
} from "./survey-utils.js";
import type { SurveyRecord } from "./types.js";

describe("Survey Utils", () => {
	it("processes new records correctly", (t: TestContext) => {
		const fetchedRecords: ApiRecord[] = [
			{
				Survey_Date: "01/10/2023",
				Kinneret_Level: -209.5,
				_id: 1,
			},
			{
				Survey_Date: "02/10/2023",
				Kinneret_Level: -209.4,
				_id: 2,
			},
		];

		const existingHistory: SurveyRecord[] = [];

		const { mergedRecords, newCount } = processRecords(
			fetchedRecords,
			existingHistory,
		);

		t.assert.strictEqual(newCount, 2);
		t.assert.strictEqual(mergedRecords.length, 2);
		// Sorted descending
		t.assert.strictEqual(mergedRecords[0].date, "2023-10-02");
		t.assert.strictEqual(mergedRecords[1].date, "2023-10-01");
	});

	it("ignores records with future dates or invalid levels", (t: TestContext) => {
		const fetchedRecords: ApiRecord[] = [
			{
				Survey_Date: "01/01/2050", // Future date
				Kinneret_Level: -209.5,
				_id: 1,
			},
			{
				Survey_Date: "01/10/2023",
				Kinneret_Level: "invalid", // NaN when converted
				_id: 2,
			},
		];

		const existingHistory: SurveyRecord[] = [];

		const { mergedRecords, newCount } = processRecords(
			fetchedRecords,
			existingHistory,
		);

		t.assert.strictEqual(newCount, 0);
		t.assert.strictEqual(mergedRecords.length, 0);
	});

	it("deduplicates records", (t: TestContext) => {
		const fetchedRecords: ApiRecord[] = [
			{
				Survey_Date: "01/10/2023",
				Kinneret_Level: -209.5,
				_id: 1,
			},
		];

		const existingHistory: SurveyRecord[] = [
			{
				date: "2023-10-01",
				level: -209.5,
			},
		];

		const { mergedRecords, newCount } = processRecords(
			fetchedRecords,
			existingHistory,
		);

		t.assert.strictEqual(newCount, 0);
		t.assert.strictEqual(mergedRecords.length, 1);
	});

	it("merges new and existing records and sorts them", (t: TestContext) => {
		const fetchedRecords: ApiRecord[] = [
			{
				Survey_Date: "02/10/2023",
				Kinneret_Level: -209.4,
				_id: 2,
			},
		];

		const existingHistory: SurveyRecord[] = [
			{
				date: "2023-10-01",
				level: -209.5,
			},
		];

		const { mergedRecords, newCount } = processRecords(
			fetchedRecords,
			existingHistory,
		);

		t.assert.strictEqual(newCount, 1);
		t.assert.strictEqual(mergedRecords.length, 2);
		t.assert.strictEqual(mergedRecords[0].date, "2023-10-02");
		t.assert.strictEqual(mergedRecords[1].date, "2023-10-01");
	});

	it("validates valid API response", (t: TestContext) => {
		const validResponse = {
			success: true,
			result: {
				records: [
					{
						Survey_Date: "01/10/2023",
						Kinneret_Level: -209.5,
						_id: 1,
					},
				],
			},
		};
		const result = validateApiResponse(validResponse);
		t.assert.strictEqual(result.valid, true);
		t.assert.strictEqual(result.errors, null);
	});

	it("invalidates invalid API response structure", (t: TestContext) => {
		const invalidResponse = {
			success: true,
			result: {
				// Missing records array
			},
		};
		const result = validateApiResponse(invalidResponse);
		t.assert.strictEqual(result.valid, false);
		t.assert.ok(result.errors && result.errors.length > 0);
	});

	it("invalidates valid structure but missing required fields in record", (t: TestContext) => {
		const invalidRecordResponse = {
			success: true,
			result: {
				records: [
					{
						// Missing Survey_Date
						Kinneret_Level: -209.5,
						_id: 1,
					},
				],
			},
		};
		const result = validateApiResponse(invalidRecordResponse);
		t.assert.strictEqual(result.valid, false);
	});
});
