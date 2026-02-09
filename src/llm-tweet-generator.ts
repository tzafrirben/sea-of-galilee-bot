import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SurveyRecord, TrendAnalysis } from "./types.js";

export interface LLMConfig {
	apiKey: string;
	model: string;
	temperature: number;
	maxTweetLength: number;
}

export async function generateTweetWithLLM(
	record: SurveyRecord,
	trends: TrendAnalysis,
	config: LLMConfig,
): Promise<string> {
	const genAI = new GoogleGenerativeAI(config.apiKey);
	const model = genAI.getGenerativeModel({
		model: config.model,
	});

	const prompt = buildPrompt(record, trends, config.maxTweetLength);

	const result = await model.generateContent({
		contents: [{ role: "user", parts: [{ text: prompt }] }],
		generationConfig: {
			temperature: config.temperature,
			maxOutputTokens: 1024,
		},
	});

	const response = result.response;
	const responseText = response.text();

	// Validate and clean response
	const cleanedTweet = cleanTweetText(responseText, config.maxTweetLength);

	return cleanedTweet;
}

function buildPrompt(
	record: SurveyRecord,
	trends: TrendAnalysis,
	maxLength: number,
): string {
	const seasonalContextHebrew = translateSeasonalContext(
		trends.seasonalContext,
	);

	// Build trend information
	const change7DaysText =
		trends.change7Days !== null
			? `${trends.change7Days > 0 ? "+" : ""}${trends.change7Days.toFixed(1)} ס״מ`
			: "לא זמין";
	const change30DaysText =
		trends.change30Days !== null
			? `${trends.change30Days > 0 ? "+" : ""}${trends.change30Days.toFixed(1)} ס״מ`
			: "לא זמין";
	const changeYearAgoText =
		trends.changeYearAgo !== null
			? `${trends.changeYearAgo > 0 ? "+" : ""}${trends.changeYearAgo.toFixed(1)} ס״מ`
			: "לא זמין";

	// Build projection text
	let projectionText = "";
	if (trends.daysToUpperRedLine !== null && trends.daysToUpperRedLine > 0) {
		projectionText = `- יגיע לקו האדום העליון בעוד ~${Math.round(trends.daysToUpperRedLine)} ימים (אם המגמה תימשך)`;
	} else if (
		trends.daysToLowerRedLine !== null &&
		trends.daysToLowerRedLine > 0
	) {
		projectionText = `- יגיע לקו האדום התחתון בעוד ~${Math.round(trends.daysToLowerRedLine)} ימים (אם המגמה תימשך)`;
	} else if (trends.daysToBlackLine !== null && trends.daysToBlackLine > 0) {
		projectionText = `- יגיע לקו השחור בעוד ~${Math.round(trends.daysToBlackLine)} ימים (אם המגמה תימשך)`;
	}

	return `אתה בוט טוויטר ישראלי המדווח על מפלס הכנרת. תפקידך ליצור ציוץ יומי בעברית על מצב המים.

נתונים עדכניים:
- תאריך: ${record.date}
- מפלס נוכחי: ${Math.abs(record.level).toFixed(2)} מטר מתחת לפני הים התיכון
- מרחק מהקו האדום העליון (${Math.abs(trends.gapToUpperRedLine / 100).toFixed(2)} מטר): ${trends.gapToUpperRedLine} ס״מ
- מרחק מהקו האדום התחתון: ${Math.abs(trends.gapToLowerRedLine)} ס״מ
- מרחק מהקו השחור: ${Math.abs(trends.gapToBlackLine)} ס״מ

מגמות:
- ${trends.isRising ? "עולה" : "יורד"} בקצב של ${Math.abs(trends.averageDailyChange7Days).toFixed(1)} ס״מ ליום (ממוצע 7 ימים)
- שינוי בשבוע האחרון: ${change7DaysText}
- שינוי בחודש האחרון: ${change30DaysText}
${trends.changeYearAgo !== null ? `- לעומת שנה שעברה: ${changeYearAgoText}` : ""}
- הקשר עונתי: ${seasonalContextHebrew}
${projectionText}

הנחיות:
1. כתוב בעברית בלבד
2. אורך מקסימלי: ${maxLength} תווים (כולל רווחים)
3. טון: אינפורמטיבי, אופטימי אך ישיר
4. הדגש את המגמה המשמעותית ביותר (עלייה/ירידה, קרבה לקו משמעותי)
5. הוסף הקשר עונתי אם רלוונטי (גשמים בחורף, אידוי בקיץ)
6. אם המפלס קרוב לקו קריטי (<50 ס״מ), הדגש זאת
7. אם המגמה חיובית, ניתן להיות אופטימי בזהירות
8. השתמש במספרים מדויקים אך עגולים (לא יותר מספרה אחת אחרי הנקודה)
9. אל תשתמש באימוג׳ים
10. החזר רק את הציוץ, ללא הסברים או טקסט נוסף

דוגמאות לסגנון:
- "מפלס הכנרת עומד היום על 213.2- מטר, 4.4 מטר מתחת לקו האדום העליון. בשבוע האחרון הכנרת עלתה ב-7.5 ס״מ בזכות הגשמים, מגמה מבורכת לעונת החורף."
- "המפלס ממשיך לרדת - כרגע 213.8- מטר, 80 ס״מ מעל הקו האדום התחתון. הירידה בקיץ צפויה, אך נותרו עוד 3 חודשים עד עונת הגשמים."

צור ציוץ עכשיו:`;
}

function translateSeasonalContext(
	context: "winter_filling" | "spring_peak" | "summer_decline" | "autumn_low",
): string {
	const translations = {
		winter_filling: "עונת גשמים ומילוי",
		spring_peak: "שיא אביב",
		summer_decline: "ירידה קיצית טבעית",
		autumn_low: "שפל סתווי",
	};
	return translations[context];
}

function cleanTweetText(text: string, maxLength: number): string {
	// Remove any markdown, extra whitespace, or wrapper text
	let cleaned = text.trim();

	// Remove common wrapper patterns
	cleaned = cleaned.replace(/^["']|["']$/g, "");
	cleaned = cleaned.replace(/^ציוץ:\s*/i, "");

	// Normalize whitespace
	cleaned = cleaned.replace(/\s+/g, " ");

	// Truncate if too long
	if (cleaned.length > maxLength) {
		cleaned = cleaned.substring(0, maxLength - 3) + "...";
	}

	return cleaned;
}
