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
    const { query } = await req.json();

    if (!query) {
      return Response.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 🧠 Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // You can change this to "gpt-4o" if supported
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that answers user queries clearly.",
        },
        { role: "user", content: query },
      ],
    });

    const answer = completion.choices[0].message.content.trim();
    const latency = Date.now() - startTime;

    // 💾 Insert AI response into 'responses'
    const { data: responseData, error: responseError } = await supabase
      .from("responses")
      .insert([{ content: answer, latency_ms: latency }])
      .select("id")
      .single();

    if (responseError) throw responseError;

    // 💾 Insert user query into 'queries' referencing the response_id
    const { error: queryError } = await supabase.from("queries").insert([
      {
        question: query,
        response_id: responseData.id,
      },
    ]);

    if (queryError) throw queryError;

    return Response.json({
      success: true,
      data: {
        query,
        response: answer,
        latency_ms: latency,
      },
    });
  } catch (error) {
    console.error("OpenAI API error:", error);

    // ⚠️ Graceful handling for OpenAI quota / rate limits
    if (error.status === 429) {
      return Response.json({
        success: false,
        message: "⚠️ API quota exceeded. Please check your billing or try again later.",
      });
    }

    // 🛠 Generic fallback
    return Response.json({
      success: false,
      message: "Something went wrong while processing your query. Please try again later.",
      error: error.message,
    });
  }
}