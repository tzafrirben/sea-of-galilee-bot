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
