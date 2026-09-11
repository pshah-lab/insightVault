import { openai } from "@/src/lib/openaiClient";
import { getLLMClient, isRateLimitError, getLLMErrorMessage } from "@/src/lib/llmClient";
import { generateEmbedding } from "@/src/lib/embeddingClient";
import { supabase } from "@/src/lib/supabaseClient";
import { checkRateLimit } from "@/src/lib/rateLimit";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_QUERY_LENGTH = 2000;
const MAX_DOC_TEXT_LENGTH = 50000;

export async function POST(req) {
  // 🛡️ Rate limit check (max 40 queries per IP per minute)
  const rateLimit = checkRateLimit(req, { limit: 40, windowMs: 60 * 1000, action: "query" });
  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, message: "Query rate limit exceeded. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  const { client: llm, model, provider } = getLLMClient();

  try {
    const body = await req.json().catch(() => ({}));
    const { query, documentText, documentId } = body;

    // 🛑 Ignore GraphQL introspection queries
    if (typeof query === "string" && (query.includes("__schema") || query.includes("IntrospectionQuery"))) {
      return Response.json({
        success: false,
        message: "GraphQL introspection query detected — ignoring.",
      });
    }

    if (!query && !documentText && !documentId) {
      return Response.json(
        { success: false, error: "At least one of query, documentText, or documentId is required." },
        { status: 400 }
      );
    }

    // 🛡️ Input length validation
    if (query && typeof query === "string" && query.length > MAX_QUERY_LENGTH) {
      return Response.json(
        { success: false, error: `Query exceeds maximum allowed length of ${MAX_QUERY_LENGTH} characters.` },
        { status: 400 }
      );
    }

    if (documentText && typeof documentText === "string" && documentText.length > MAX_DOC_TEXT_LENGTH) {
      return Response.json(
        { success: false, error: `Document text exceeds maximum allowed length of ${MAX_DOC_TEXT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    // 🛡️ Document ID format validation
    if (documentId && (typeof documentId !== "string" || !UUID_REGEX.test(documentId))) {
      return Response.json(
        { success: false, error: "Invalid documentId format. Must be a valid UUID." },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let contextText = "";
    let sources = [];

    // ⚡ Step 1: Retrieve semantic context via Supabase (RAG)
    if (documentId && query) {
      // 1️⃣ Generate embedding for the user's query (HF -> Gemini -> OpenAI)
      const { vector: queryEmbedding } = await generateEmbedding(query);

      // 2️⃣ Match most relevant chunks using custom SQL function
      let { data: matches, error: matchError } = await supabase.rpc(
        "match_chunks",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.2, // lowered sensitivity for embeddings
          match_count: 6, // top 6 similar chunks
          document_id: documentId,
        }
      );

      if (matchError) {
        console.error("❌ Supabase RAG error:", matchError);
        throw new Error("Failed to match document chunks");
      }

      // 🔄 Fallback 1: If no chunks met 0.2 threshold, retry with 0.0 threshold to get top candidates
      if (!matches || matches.length === 0) {
        console.log("ℹ️ No chunks met threshold 0.2, trying fallback with threshold 0.0");
        const { data: fallbackMatches } = await supabase.rpc("match_chunks", {
          query_embedding: queryEmbedding,
          match_threshold: 0.0,
          match_count: 6,
          document_id: documentId,
        });
        if (fallbackMatches && fallbackMatches.length > 0) {
          matches = fallbackMatches;
        }
      }

      // 🔄 Fallback 2: If still no chunks (e.g. extreme mismatch), fetch first chunks directly from DB
      if (!matches || matches.length === 0) {
        console.log("ℹ️ No chunks from vector search, fetching raw document chunks as fallback");
        const { data: directChunks } = await supabase
          .from("document_chunks")
          .select("id, content")
          .eq("document_id", documentId)
          .limit(6);

        if (directChunks && directChunks.length > 0) {
          matches = directChunks.map((chunk) => ({
            id: chunk.id,
            content: chunk.content,
            similarity: null,
          }));
        }
      }

      // Format sources for citation preview in the UI
      if (matches && matches.length > 0) {
        sources = matches.map((chunk, idx) => ({
          id: chunk.id || idx + 1,
          content: chunk.content,
          similarity:
            chunk.similarity !== undefined && chunk.similarity !== null
              ? Number(chunk.similarity.toFixed(3))
              : null,
        }));

        // 3️⃣ Combine matched chunks as context
        contextText = matches
          .map((chunk) => chunk.content)
          .join("\n\n---\n\n")
          .slice(0, 8000); // truncate to avoid token overflow
      }
    }

    // 🧠 Step 2: Build the prompt
    let finalPrompt = "";

    if (documentText) {
      // Classic document mode
      finalPrompt = `Analyze the following document and answer accordingly:
-------------------------
${documentText.slice(0, 8000)}
-------------------------
User Query: ${query || "Summarize this document"}
`;
    } else if (documentId) {
      // RAG mode
      finalPrompt = `You are analyzing information retrieved from a document.
Use the provided context to answer the user's question precisely.
If the answer is not found in the context, respond with "The document does not contain that information."

Context:
-------------------------
${contextText || "No relevant context found."}
-------------------------

User Query:
"${query}"
`;
    } else {
      // Fallback general query
      finalPrompt = query;
    }

    // 🤖 Step 3: Call LLM API (Groq Llama 3.3 or OpenAI)
    const completion = await llm.chat.completions.create({
      model,
      temperature: 0.5,
      max_tokens: 800, // Explicitly bound output tokens to stay within Groq free tier limits
      messages: [
        {
          role: "system",
          content:
            "You are InsightVault — a data-aware assistant that provides factual, structured, and clear answers.",
        },
        { role: "user", content: finalPrompt },
      ],
    });

    const answer = completion.choices[0]?.message?.content?.trim() || "No response generated.";
    const latency = Date.now() - startTime;

    // 💾 Step 4: Save AI response
    const { data: responseData, error: responseError } = await supabase
      .from("responses")
      .insert([{ content: answer, latency_ms: latency }])
      .select("id")
      .single();

    if (responseError) throw responseError;

    // 💾 Step 5: Save query referencing response
    const { error: queryError } = await supabase.from("queries").insert([
      {
        question: query || "[Document Analysis]",
        response_id: responseData.id,
      },
    ]);

    if (queryError) throw queryError;

    // ✅ Step 6: Return success with provider metadata
    return Response.json({
      success: true,
      data: {
        query,
        response: answer,
        latency_ms: latency,
        provider,
        model,
        contextUsed: documentId ? contextText?.slice(0, 400) : null,
        sources: sources.length > 0 ? sources : null,
      },
    });
  } catch (error) {
    console.error(`❌ ${provider} Query API error:`, error);

    // ⚠️ Handle rate limits
    if (isRateLimitError(error)) {
      return Response.json(
        {
          success: false,
          isRateLimit: true,
          message: getLLMErrorMessage(error, provider),
          error: error.message || `${provider} rate limit or quota exceeded`,
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        success: false,
        message: error.message || `Something went wrong while processing your query with ${provider}.`,
        error: error.message,
      },
      { status: 500 }
    );
  }
}