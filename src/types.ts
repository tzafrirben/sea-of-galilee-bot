export interface SurveyRecord {
	date: string; // Format: YYYY-MM-DD
	level: number;
}

export interface ApiResponse {
	success: boolean;
	result: {
		records: Array<{
			Survey_Date: string;
			Kinneret_Level: number | string;
			_id: number;
		}>;
	};
}

export interface TrendAnalysis {
	// Current state
	currentLevel: number;
	currentDate: string;

	// Gaps to thresholds (in cm)
	gapToUpperRedLine: number;
	gapToLowerRedLine: number;
	gapToBlackLine: number;

	// Historical trends
	change7Days: number | null; // cm change over 7 days
	change30Days: number | null; // cm change over 30 days
	changeYearAgo: number | null; // comparison to same date last year

	// Rate of change
	averageDailyChange7Days: number; // cm/day average
	isRising: boolean; // true if rising, false if falling

	// Time projections (if trend continues)
	daysToUpperRedLine: number | null; // Only if rising
	daysToLowerRedLine: number | null; // Only if falling
	daysToBlackLine: number | null; // Only if falling critically

	// Context
	seasonalContext:
		| "winter_filling"
		| "spring_peak"
		| "summer_decline"
		| "autumn_low";
	nearestThreshold: "upper_red" | "lower_red" | "black";
	nearestThresholdDistance: number; // in cm
	isNearCriticalThreshold: boolean; // Within 50cm of lower red or black
}
