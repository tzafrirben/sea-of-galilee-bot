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

	// Build historical context
	const historicalHighText = trends.historicalHigh
		? `- שיא היסטורי: ${Math.abs(trends.historicalHigh.level).toFixed(2)} מטר (לפני ${trends.historicalHigh.yearsAgo} שנים, בתאריך ${trends.historicalHigh.date})`
		: "";
	const historicalLowText = trends.historicalLow
		? `- שפל היסטורי: ${Math.abs(trends.historicalLow.level).toFixed(2)} מטר (לפני ${trends.historicalLow.yearsAgo} שנים, בתאריך ${trends.historicalLow.date})`
		: "";

	// Build comparison to previous years
	const previousYearsText = trends.comparisonToPreviousYears
		.map(
			(comp) =>
				`  - ${comp.year}: ${Math.abs(comp.level).toFixed(2)} מטר (${comp.difference > 0 ? "+" : ""}${comp.difference} ס״מ לעומת היום)`,
		)
		.join("\n");

	const rankText = `- דירוג: ${trends.rankPercentile}% (${trends.rankPercentile > 80 ? "גבוה מאוד" : trends.rankPercentile > 60 ? "גבוה" : trends.rankPercentile > 40 ? "ממוצע" : trends.rankPercentile > 20 ? "נמוך" : "נמוך מאוד"})`;

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

נתונים היסטוריים:
${historicalHighText}
${historicalLowText}
${rankText}

השוואה לשנים קודמות:
${previousYearsText}

הנחיות:
1. כתוב בעברית בלבד
2. אורך מקסימלי: ${maxLength} תווים (כולל רווחים)
3. טון: מגוון - יכול להיות אינפורמטיבי, מעניין, אופטימי, או מעט הומוריסטי (בזהירות)
4. **חשוב מאוד**: נוע פורמטים מגוונים ויצירתיים! בחר מבין 10+ האפשרויות הבאות:

   📊 פורמטים בסיסיים:
   - פורמט מגמות: דגש על שינוי שבועי/חודשי (למשל: "המפלס עלה ב-X ס״מ השבוע")
   - פורמט השוואה שנתית: השווה לשנים קודמות (למשל: "גבוה ב-X ס״מ משנה שעברה")
   - פורמט היסטורי: התייחס לשיא/שפל (למשל: "רחוק Y מטר מהשיא ב-2004")
   - פורמט דירוג: הזכר מיקום בהיסטוריה (למשל: "בדירוג 70% - מצב טוב")

   🎯 פורמטים יצירתיים:
   - פורמט שאלה: התחל בשאלה רטורית (למשל: "כמה מים יש בכנרת היום? 213.2- מטר...")
   - פורמט עובדה מעניינת: שתף פרט מפתיע (למשל: "ידעתם? המפלס היום זהה למדויק לזה של 2020")
   - פורמט נרטיבי: ספר סיפור קצר (למשל: "מתחילת החורף הכנרת עלתה ב-X מטר, מסע מרשים")
   - פורמט ציר זמן: "מאז X התאריך, המפלס עלה/ירד ב-Y"
   - פורמט השוואתי: השווה למקורות מים אחרים או לתקופות היסטוריות
   - פורמט אופטימי/ביקורתי: הדגש צד חיובי או שלילי באופן בולט
   - פורמט צפי עתידי: "אם המגמה תימשך, בעוד X ימים..."
   - פורמט אבן דרך: חגוג הישגים (למשל: "המפלס עבר את רף ה-...")

5. **נוע בסגנונות שונים**:
   - לפעמים קצר וישיר (120-150 תווים)
   - לפעמים מפורט יותר (200-280 תווים)
   - לפעמים התחל במספר, לפעמים בהקשר
   - לפעמים הזכר עונה, לפעמים השווה לעבר
   - לפעמים דרמטי (אם קריטי), לפעמים עניני

6. **כללי תוכן**:
   - תמיד כלול את המפלס המדויק
   - הוסף הקשר משמעותי אחד לפחות (היסטורי/עונתי/השוואתי)
   - אם המפלס קרוב לקו קריטי (<50 ס״מ), הדגש בבהירות
   - אם מגמה חיובית מאוד, הבע אופטימיות
   - אל תשתמש באימוג׳ים
   - החזר רק את הציוץ, ללא הסברים

דוגמאות לפורמטים מגוונים:

1. מגמות קלאסי: "מפלס הכנרת: 213.2- מטר. השבוע עלייה של 7.5 ס״מ בזכות הגשמים. המגמה חיובית לקראת סוף החורף."

2. השוואה שנתית: "היום המפלס 213.2- מטר, גבוה ב-15 ס״מ משנה שעברה. עונת גשמים טובה יותר הניבה פירות."

3. היסטורי דרמטי: "213.2- מטר - המפלס הגבוה ביותר מזה 3 שנים! עדיין 3.4 מטר מהשיא ההיסטורי (2004), אבל שיפור ניכר."

4. פורמט שאלה: "עד כמה הכנרת מלאה? 213.2- מטר, 65% ביחס להיסטוריה. מצב סולידי לתחילת אביב."

5. עובדה מעניינת: "ידעתם? המפלס של היום (213.2-) זהה בדיוק למפלס ב-15/2/2019. ההיסטוריה חוזרת על עצמה."

6. נרטיבי: "מסע החורף: הכנרת עלתה מ-214.1- ל-213.2- - רווח של 90 ס״מ ב-3 חודשים. עוד 4.4 מטר לקו האדום העליון."

7. ציר זמן: "מאז תחילת ינואר, המפלס עלה ב-23 ס״מ. כרגע 213.2- מטר, קצב עלייה של ~6 ס״מ לשבוע."

8. אופטימי חגיגי: "בשורה טובה! 213.2- מטר - המפלס חצה את רף ה-213.5! ממשיכים לטפס אל הקו האדום העליון."

9. קריטי ומזהיר: "תשומת לב: המפלס 213.85- מטר, רק 85 ס״מ מהקו האדום התחתון. המצב דורש מעקב."

10. צפי עתידי: "המפלס 213.2- מטר, עולה ב-1.2 ס״מ ליום. אם זה ימשך, נגיע ל-213- בעוד שבועיים."

11. השוואתי ייחודי: "213.2- מטר. באותה תקופה ב-2003 היינו ב-214.5- - שיפור של 1.3 מטר! תקווה למחזור גשמים טוב."

12. קצר וחד: "עדכון הכנרת: 213.2- מטר. עלייה של 7 ס״מ מאתמול. עונת גשמים פעילה."

צור ציוץ עכשיו בפורמט יצירתי ומגוון (בחר אחד שונה מהפעם הקודמת!):`;
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
