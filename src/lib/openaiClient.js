import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Checks if an error thrown by OpenAI is due to rate limits (429) or quota exhaustion
 */
export function isOpenAIRateLimit(error) {
  if (!error) return false;

  const status = error.status || error.statusCode || error.response?.status;
  const code = error.code || error.error?.code;
  const type = error.type || error.error?.type;
  const message = (error.message || error.error?.message || "").toLowerCase();

  return (
    status === 429 ||
    code === "rate_limit_exceeded" ||
    code === "insufficient_quota" ||
    type === "insufficient_quota" ||
    error.name === "RateLimitError" ||
    message.includes("rate limit") ||
    message.includes("quota exceeded") ||
    message.includes("too many requests") ||
    message.includes("exceeded your current quota")
  );
}

/**
 * Returns a user-friendly error message when OpenAI rate limit or general error occurs
 */
export function getOpenAIErrorMessage(error) {
  if (isOpenAIRateLimit(error)) {
    return "⚠️ OpenAI rate limit or quota exceeded. Please check your OpenAI billing details or try again in a few moments.";
  }
  return error?.message || "An unexpected error occurred while communicating with OpenAI.";
}