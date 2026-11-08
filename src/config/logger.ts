import pino from "pino";

const isTest = process.env.NODE_ENV === "test";
const isDevelopment = (process.env.NODE_ENV ?? "development") === "development";

// Read straight from process.env so CLI tools can log without needing the full app configuration.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isTest ? "silent" : "info"),
  ...(isDevelopment && { transport: { target: "pino-pretty", options: { colorize: true } } })
});
