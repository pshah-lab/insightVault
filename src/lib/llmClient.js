import OpenAI from "openai";
import { openai, isOpenAIRateLimit as isOpenAIRateLimitInternal } from "./openaiClient.js";

/**
 * Returns the active LLM client, model name, and provider label.
 * Automatically defaults to Groq when GROQ_API_KEY is configured in .env.
 */
export function getLLMClient() {
  const groqKey = process.env.GROQ_API_KEY?.trim();

  if (groqKey) {
    const groqClient = new OpenAI({
      apiKey: groqKey,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const model = process.env.GROQ_MODEL?.trim() || "qwen/qwen3.8-27b";

    return {
      client: groqClient,
      model,
      provider: `Groq (${model})`,
      isGroq: true,
    };
  }

  return {
    client: openai,
    model: "gpt-4o-mini",
    provider: "OpenAI (GPT-4o Mini)",
    isGroq: false,
  };
}

/**
 * Checks if an error from Groq or OpenAI is due to rate limits or quota exhaustion
 */
export function isRateLimitError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode || error.response?.status;
  const message = (error.message || error.error?.message || "").toLowerCase();
  const code = error.code || error.error?.code;

  return (
    status === 429 ||
    code === "rate_limit_exceeded" ||
    code === "insufficient_quota" ||
    message.includes("rate limit") ||
    message.includes("quota exceeded") ||
    message.includes("too many requests") ||
    message.includes("exceeded your current quota") ||
    isOpenAIRateLimitInternal(error)
  );
}

/**
 * Returns a clean, helpful error message for the active provider
 */
export function getLLMErrorMessage(error, provider = "AI") {
  if (isRateLimitError(error)) {
    return `⚠️ ${provider} rate limit or quota exceeded. Please verify your API key or try again in a few moments.`;
  }
  return error?.message || `An unexpected error occurred while communicating with ${provider}.`;
}
