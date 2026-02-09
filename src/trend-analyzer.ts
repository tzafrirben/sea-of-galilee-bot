import {
	differenceInDays,
	getMonth,
	parseISO,
	subDays,
	subYears,
} from "date-fns";
import type { SurveyRecord, TrendAnalysis } from "./types.js";

interface Thresholds {
	upperRedLine: number;
	lowerRedLine: number;
	blackLine: number;
}

export function analyzeTrends(
	surveys: SurveyRecord[],
	currentRecord: SurveyRecord,
	thresholds: Thresholds,
): TrendAnalysis {
	const currentDate = parseISO(currentRecord.date);
	const currentLevel = currentRecord.level;

	// Calculate gaps to thresholds (in cm)
	const gapToUpperRedLine = Math.round(
		(thresholds.upperRedLine - currentLevel) * 100,
	);
	const gapToLowerRedLine = Math.round(
		(thresholds.lowerRedLine - currentLevel) * 100,
	);
	const gapToBlackLine = Math.round(
		(thresholds.blackLine - currentLevel) * 100,
	);

	// Find historical records
	const record7DaysAgo = findClosestRecord(surveys, subDays(currentDate, 7));
	const record30DaysAgo = findClosestRecord(surveys, subDays(currentDate, 30));
	const record1YearAgo = findClosestRecord(surveys, subYears(currentDate, 1));

	// Calculate changes
	const change7Days = record7DaysAgo
		? Math.round((currentLevel - record7DaysAgo.level) * 100)
		: null;
	const change30Days = record30DaysAgo
		? Math.round((currentLevel - record30DaysAgo.level) * 100)
		: null;
	const changeYearAgo = record1YearAgo
		? Math.round((currentLevel - record1YearAgo.level) * 100)
		: null;

	// Calculate rate of change (using 7-day trend as primary indicator)
	const averageDailyChange7Days =
		change7Days !== null && record7DaysAgo
			? change7Days /
				differenceInDays(currentDate, parseISO(record7DaysAgo.date))
			: 0;
	const isRising = averageDailyChange7Days > 0;

	// Project days to thresholds (linear extrapolation)
	let daysToUpperRedLine: number | null = null;
	let daysToLowerRedLine: number | null = null;
	let daysToBlackLine: number | null = null;

	if (averageDailyChange7Days !== 0) {
		if (isRising && gapToUpperRedLine > 0) {
			daysToUpperRedLine = Math.round(
				gapToUpperRedLine / averageDailyChange7Days,
			);
		} else if (!isRising && gapToLowerRedLine < 0) {
			// If below lower red line
			daysToLowerRedLine = Math.round(
				Math.abs(gapToLowerRedLine) / Math.abs(averageDailyChange7Days),
			);
		} else if (!isRising && gapToBlackLine < 0) {
			// If below black line
			daysToBlackLine = Math.round(
				Math.abs(gapToBlackLine) / Math.abs(averageDailyChange7Days),
			);
		}
	}

	// Determine seasonal context
	const seasonalContext = determineSeasonalContext(currentDate);

	// Find nearest threshold
	const thresholdDistances = [
		{ name: "upper_red" as const, distance: Math.abs(gapToUpperRedLine) },
		{ name: "lower_red" as const, distance: Math.abs(gapToLowerRedLine) },
		{ name: "black" as const, distance: Math.abs(gapToBlackLine) },
	];
	const nearest = thresholdDistances.reduce((min, curr) =>
		curr.distance < min.distance ? curr : min,
	);

	const isNearCriticalThreshold =
		Math.abs(gapToLowerRedLine) < 50 || Math.abs(gapToBlackLine) < 50;

	return {
		currentLevel,
		currentDate: currentRecord.date,
		gapToUpperRedLine,
		gapToLowerRedLine,
		gapToBlackLine,
		change7Days,
		change30Days,
		changeYearAgo,
		averageDailyChange7Days,
		isRising,
		daysToUpperRedLine,
		daysToLowerRedLine,
		daysToBlackLine,
		seasonalContext,
		nearestThreshold: nearest.name,
		nearestThresholdDistance: nearest.distance,
		isNearCriticalThreshold,
	};
}

function findClosestRecord(
	surveys: SurveyRecord[],
	targetDate: Date,
): SurveyRecord | null {
	if (surveys.length === 0) return null;

	// Find the record closest to the target date (within 7 days tolerance)
	const tolerance = 7;
	let closest: SurveyRecord | null = null;
	let minDiff = Number.POSITIVE_INFINITY;

	for (const record of surveys) {
		const recordDate = parseISO(record.date);
		const diff = Math.abs(differenceInDays(recordDate, targetDate));

		if (diff < minDiff && diff <= tolerance) {
			minDiff = diff;
			closest = record;
		}
	}

	return closest;
}

function determineSeasonalContext(
	date: Date,
): "winter_filling" | "spring_peak" | "summer_decline" | "autumn_low" {
	const month = getMonth(date); // 0-11

	// December-February: Winter filling season (rain)
	if (month === 11 || month <= 1) return "winter_filling";

	// March-April: Spring peak
	if (month >= 2 && month <= 3) return "spring_peak";

	// May-August: Summer decline (pumping, evaporation)
	if (month >= 4 && month <= 7) return "summer_decline";

	// September-November: Autumn low
	return "autumn_low";
}
