import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export async function POST(req) {
  try {
    const { query, documentText, documentId } = await req.json();

    // 🛑 Ignore GraphQL introspection queries
if (query?.includes("__schema") || query?.includes("IntrospectionQuery")) {
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

    const startTime = Date.now();
    let contextText = "";

    // ⚡ Step 1: Retrieve semantic context via Supabase (RAG)
    if (documentId && query) {
      // 1️⃣ Generate embedding for the user's query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // 2️⃣ Match most relevant chunks using your custom SQL function
      const { data: matches, error: matchError } = await supabase.rpc(
        "match_chunks",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, // adjust sensitivity
          match_count: 5, // top 5 similar chunks
          document_id: documentId,
        }
      );

      if (matchError) {
        console.error("❌ Supabase RAG error:", matchError);
        throw new Error("Failed to match document chunks");
      }

      // 3️⃣ Combine matched chunks as context
      contextText = matches
        .map((chunk) => chunk.content)
        .join("\n\n---\n\n")
        .slice(0, 8000); // truncate to avoid token overflow
    }

    // 🧠 Step 2: Build the final GPT prompt
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

    // 🤖 Step 3: Call OpenAI Chat API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
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

    // ✅ Step 6: Return success
    return Response.json({
      success: true,
      data: {
        query,
        response: answer,
        latency_ms: latency,
        contextUsed: documentId ? contextText?.slice(0, 400) : null,
      },
    });
  } catch (error) {
    console.error("❌ OpenAI Query API error:", error);

    // ⚠️ Handle rate limits
    if (error.status === 429) {
      return Response.json({
        success: false,
        message: "⚠️ API quota exceeded. Please check your OpenAI billing or try again later.",
      });
    }

    return Response.json({
      success: false,
      message: "Something went wrong while processing your query.",
      error: error.message,
    });
  }
}