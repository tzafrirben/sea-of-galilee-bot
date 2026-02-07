import {
	getDate,
	getDay,
	getMonth,
	getYear,
	isAfter,
	parseISO,
} from "date-fns";
import type { SurveyRecord } from "./types.js";

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HEBREW_MONTHS = [
	"ינואר",
	"פברואר",
	"מרץ",
	"אפריל",
	"מאי",
	"יוני",
	"יולי",
	"אוגוסט",
	"ספטמבר",
	"אוקטובר",
	"נובמבר",
	"דצמבר",
];

export function formatTweet(
	record: SurveyRecord,
	upperRedLine: number,
): string {
	const dateObj = parseISO(record.date);
	const dayName = HEBREW_DAYS[getDay(dateObj)];
	const dayOfMonth = getDate(dateObj);
	const monthName = HEBREW_MONTHS[getMonth(dateObj)];
	const year = getYear(dateObj);

	const currentLevel = record.level;
	const gap = (upperRedLine - currentLevel) * 100;

	const levelAbs = Math.abs(currentLevel).toFixed(3);
	const upperRedLineAbs = Math.abs(upperRedLine).toFixed(2);
	const gapInt = Math.round(gap);

	return `מפלס הכנרת שנמדד ביום ${dayName} ה-${dayOfMonth} ל${monthName} ${year} עומד על ${levelAbs}-, וכעת וחסרים לה ${gapInt} סנטימטר לקו האדום העליון (${upperRedLineAbs}-)`;
}

export function findNewRecords(
	surveys: SurveyRecord[],
	lastTweetDateStr: string,
): SurveyRecord[] {
	const lastTweetDate = lastTweetDateStr
		? parseISO(lastTweetDateStr)
		: new Date(0);

	const newRecords = surveys.filter((record) => {
		const recordDate = parseISO(record.date);
		return isAfter(recordDate, lastTweetDate);
	});

	// Sort new records descending (newest first)
	newRecords.sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	return newRecords;
}
