import assert from "node:assert";
import { describe, it } from "node:test";
import { analyzeTrends } from "./trend-analyzer.js";
import type { SurveyRecord } from "./types.js";

describe("Trend Analyzer", () => {
	const thresholds = {
		upperRedLine: -208.8,
		lowerRedLine: -213,
		blackLine: -214.87,
	};

	it("should calculate gaps to thresholds correctly", () => {
		const surveys: SurveyRecord[] = [{ date: "2026-02-06", level: -213.16 }];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		// Gap to upper red line: (-208.80 - (-213.16)) * 100 = 436 cm
		assert.strictEqual(trends.gapToUpperRedLine, 436);

		// Gap to lower red line: (-213 - (-213.16)) * 100 = 16 cm
		assert.strictEqual(trends.gapToLowerRedLine, 16);

		// Gap to black line: (-214.87 - (-213.16)) * 100 = -171 cm
		assert.strictEqual(trends.gapToBlackLine, -171);
	});

	it("should calculate 7-day change correctly", () => {
		const surveys: SurveyRecord[] = [
			{ date: "2026-02-06", level: -213.16 },
			{ date: "2026-01-30", level: -213.24 },
		];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		// Change: (-213.16 - (-213.24)) * 100 = 8 cm (rising)
		assert.strictEqual(trends.change7Days, 8);
		assert.strictEqual(trends.isRising, true);
	});

	it("should identify winter filling season correctly", () => {
		const surveys: SurveyRecord[] = [{ date: "2026-01-15", level: -213.16 }];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		assert.strictEqual(trends.seasonalContext, "winter_filling");
	});

	it("should identify summer decline season correctly", () => {
		const surveys: SurveyRecord[] = [{ date: "2026-07-15", level: -213.16 }];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		assert.strictEqual(trends.seasonalContext, "summer_decline");
	});

	it("should determine nearest threshold correctly", () => {
		const surveys: SurveyRecord[] = [{ date: "2026-02-06", level: -213.05 }];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		// Closest to lower red line (5 cm away)
		assert.strictEqual(trends.nearestThreshold, "lower_red");
		assert.strictEqual(trends.nearestThresholdDistance, 5);
	});

	it("should flag near critical threshold", () => {
		const surveys: SurveyRecord[] = [{ date: "2026-02-06", level: -213.3 }];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		// Within 50cm of lower red line
		assert.strictEqual(trends.isNearCriticalThreshold, true);
	});

	it("should handle missing historical data gracefully", () => {
		const surveys: SurveyRecord[] = [{ date: "2026-02-06", level: -213.16 }];

		const trends = analyzeTrends(surveys, surveys[0], thresholds);

		assert.strictEqual(trends.change7Days, null);
		assert.strictEqual(trends.change30Days, null);
		assert.strictEqual(trends.changeYearAgo, null);
	});
});
