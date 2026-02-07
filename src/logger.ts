import process from "node:process";
import pino from "pino";

// Create a logger instance
// We write to stderr (destination 2) to ensure that stdout is kept clean
// for scripts that output data for piping/capturing (like prepare-tweet.ts)
export const logger = pino(
	{
		level: process.env.LOG_LEVEL || "info",
		base: undefined, // Remove pid and hostname to keep logs cleaner
		timestamp: pino.stdTimeFunctions.isoTime,
	},
	pino.destination(2),
);
