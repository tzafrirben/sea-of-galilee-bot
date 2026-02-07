import { describe, it, type TestContext } from "node:test";
import { findNewRecords, formatTweet } from "./tweet-utils.js";
import type { SurveyRecord } from "./types.js";

describe("Tweet Utils", () => {
	it("formats the tweet correctly", (t: TestContext) => {
		const record: SurveyRecord = {
			date: "2023-10-01",
			level: -209.5,
		};
		const upperRedLine = -208.8;

		const expected =
			"מפלס הכנרת שנמדד ביום ראשון ה-1 לאוקטובר 2023 עומד על 209.500-, וכעת וחסרים לה 70 סנטימטר לקו האדום העליון (208.80-)";
		const result = formatTweet(record, upperRedLine);

		t.assert.strictEqual(result, expected);
	});

	it("formats the tweet correctly for different date/level", (t: TestContext) => {
		const record: SurveyRecord = {
			date: "2024-01-15",
			level: -210.123,
		};
		const upperRedLine = -208.8;

		const expected =
			"מפלס הכנרת שנמדד ביום שני ה-15 לינואר 2024 עומד על 210.123-, וכעת וחסרים לה 132 סנטימטר לקו האדום העליון (208.80-)";
		const result = formatTweet(record, upperRedLine);

		t.assert.strictEqual(result, expected);
	});

	it("finds new records correctly", (t: TestContext) => {
		const surveys: SurveyRecord[] = [
			{ date: "2023-10-03", level: -209.3 },
			{ date: "2023-10-02", level: -209.4 },
			{ date: "2023-10-01", level: -209.5 },
		];
		const lastTweetDate = "2023-10-01";

		const newRecords = findNewRecords(surveys, lastTweetDate);

		t.assert.strictEqual(newRecords.length, 2);
		t.assert.strictEqual(newRecords[0].date, "2023-10-03");
		t.assert.strictEqual(newRecords[1].date, "2023-10-02");
	});

	it("returns all records if no last tweet date provided", (t: TestContext) => {
		const surveys: SurveyRecord[] = [
			{ date: "2023-10-01", level: -209.5 },
		];
		const lastTweetDate = "";

		const newRecords = findNewRecords(surveys, lastTweetDate);

		t.assert.strictEqual(newRecords.length, 1);
		t.assert.strictEqual(newRecords[0].date, "2023-10-01");
	});

	it("returns empty array if no new records", (t: TestContext) => {
		const surveys: SurveyRecord[] = [
			{ date: "2023-10-01", level: -209.5 },
		];
		const lastTweetDate = "2023-10-01";

		const newRecords = findNewRecords(surveys, lastTweetDate);

		t.assert.strictEqual(newRecords.length, 0);
	});
});
