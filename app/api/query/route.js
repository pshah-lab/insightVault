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
    const { query, documentText } = await req.json();

    if (!query && !documentText) {
      return Response.json(
        { success: false, error: "Either 'query' or 'documentText' is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // ✂️ Truncate very large PDFs to avoid hitting token limits (keep first 10k chars)
    const truncatedDoc =
      documentText && documentText.length > 10000
        ? documentText.slice(0, 10000) + "\n\n[...Truncated for brevity]"
        : documentText;

    // 🧠 Build the final LLM prompt dynamically
    const finalPrompt = documentText
      ? `You are analyzing a document uploaded by the user. 
The document text is below:
----------------------------------------
${truncatedDoc}
----------------------------------------

Now, ${
        query
          ? `answer this specific query from the user:\n"${query}".`
          : "provide a structured and concise summary of the document's key ideas, sections, and insights."
      }

Return your output in well-formatted paragraphs, using bullet points where useful.`
      : query;

    // ⚡ Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are InsightVault — a helpful assistant that provides analytical, factual, and structured answers for user data or document queries.",
        },
        { role: "user", content: finalPrompt },
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0]?.message?.content?.trim() || "No response generated.";
    const latency = Date.now() - startTime;

    // 💾 Save response in Supabase
    const { data: responseData, error: responseError } = await supabase
      .from("responses")
      .insert([{ content: answer, latency_ms: latency }])
      .select("id")
      .single();

    if (responseError) throw responseError;

    // 💾 Save query referencing response
    const { error: queryError } = await supabase.from("queries").insert([
      {
        question: query || "[Document Analysis]",
        response_id: responseData.id,
      },
    ]);

    if (queryError) throw queryError;

    // ✅ Respond success
    return Response.json({
      success: true,
      data: {
        query: query || "[Document Analysis]",
        response: answer,
        latency_ms: latency,
      },
    });
  } catch (error) {
    console.error("OpenAI Query API error:", error);

    // ⚠️ Graceful handling for rate limits
    if (error.status === 429) {
      return Response.json({
        success: false,
        message:
          "⚠️ API quota exceeded. Please check your OpenAI billing or try again later.",
      });
    }

    // 🧩 General fallback
    return Response.json({
      success: false,
      message:
        "Something went wrong while processing your query. Please try again later.",
      error: error.message,
    });
  }
}