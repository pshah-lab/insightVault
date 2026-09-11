import { openai } from "./openaiClient.js";

function padTo1536(vector) {
  if (!Array.isArray(vector)) return [];
  if (vector.length >= 1536) return vector.slice(0, 1536);
  return [...vector, ...new Array(1536 - vector.length).fill(0)];
}

/**
 * Generates vector embeddings for a list of text chunks.
 * Priority order:
 * 1. Hugging Face Inference API (if HUGGINGFACE_API_KEY is configured)
 * 2. Google Gemini (automatic fallback if HF quota/permissions fail)
 * 3. OpenAI (fallback if OPENAI_API_KEY has credits)
 *
 * @param {string[]} texts - Array of strings to embed
 * @returns {Promise<{ vectors: number[][], provider: string }>}
 */
export async function generateEmbeddings(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return { vectors: [], provider: "None" };
  }

  const hfKey = process.env.HUGGINGFACE_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  // 1️⃣ Try Hugging Face first
  if (hfKey) {
    try {
      const res = await fetch(
        "https://router.huggingface.co/hf-inference/models/BAAI/bge-small-en-v1.5",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${hfKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: texts }),
        }
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        const vectors = data.map((v) => {
          const arr = Array.isArray(v) ? v : [v];
          return padTo1536(arr);
        });

        return { vectors, provider: "Hugging Face (BAAI/bge-small-en-v1.5)" };
      }

      console.warn("⚠️ Hugging Face embedding unavailable, falling back to Gemini:", data?.error || data?.message);
    } catch (err) {
      console.warn("⚠️ Hugging Face embedding error, falling back to Gemini:", err.message);
    }
  }

  // 2️⃣ Fallback to Google Gemini (Native 1536 dimensions)
  if (geminiKey) {
    try {
      // 🛡️ Pass API key via header rather than URL query parameter to prevent credential leakage in logs
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          requests: texts.map((t) => ({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: t }] },
            outputDimensionality: 1536,
          })),
        }),
      });

      const data = await res.json();

      if (data.embeddings && Array.isArray(data.embeddings)) {
        const vectors = data.embeddings.map((e) => e.values);
        return { vectors, provider: "Google Gemini (gemini-embedding-001)" };
      }

      console.warn("⚠️ Gemini embedding error, falling back to OpenAI:", data?.error?.message);
    } catch (err) {
      console.warn("⚠️ Gemini embedding error, falling back to OpenAI:", err.message);
    }
  }

  // 3️⃣ Fallback to OpenAI
  try {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    const vectors = embeddingRes.data.map((item) => item.embedding);
    return { vectors, provider: "OpenAI (text-embedding-3-small)" };
  } catch (err) {
    console.error("❌ All embedding providers failed:", err.message);
    throw new Error(
      `Embedding generation failed across Hugging Face, Gemini, and OpenAI. Details: ${err.message}`
    );
  }
}

/**
 * Generates a single vector embedding for a text query.
 *
 * @param {string} text - Single string to embed
 * @returns {Promise<{ vector: number[], provider: string }>}
 */
export async function generateEmbedding(text) {
  const { vectors, provider } = await generateEmbeddings([text]);
  return { vector: vectors[0], provider };
}
