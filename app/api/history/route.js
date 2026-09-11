import { supabase } from "@/src/lib/supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("queries")
      .select(
        `
        id,
        question,
        created_at,
        responses (id, content, latency_ms, created_at)
      `
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (error) {
    const isSchemaMissing =
      error.message?.includes("schema cache") ||
      error.message?.includes("relation") ||
      error.message?.includes("does not exist");

    console.error("Error fetching history:", error.message);
    return Response.json({
      success: false,
      isSchemaMissing,
      error: isSchemaMissing
        ? "Supabase tables not initialized. Please run supabase-schema.sql."
        : error.message,
    });
  }
}

export async function POST(req) {
  try {
    const { question, response } = await req.json();

    if (!question || !response) {
      return Response.json(
        { success: false, message: "Question and response are required" },
        { status: 400 }
      );
    }

    // 1️⃣ Insert the response first
    const { data: responseData, error: responseError } = await supabase
      .from("responses")
      .insert([
        {
          content: response,
          latency_ms: 0,
        },
      ])
      .select("id")
      .single();

    if (responseError) throw responseError;

    // 2️⃣ Insert the query with response_id reference
    const { error: queryError } = await supabase.from("queries").insert([
      {
        question,
        response_id: responseData.id,
      },
    ]);

    if (queryError) throw queryError;

    return Response.json({
      success: true,
      message: "Record added successfully",
    });
  } catch (error) {
    console.error("Error adding record:", error.message);
    return Response.json({ success: false, error: error.message });
  }
}

// 🧹 DELETE: Clear all history (requires explicit ?confirm=true)
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const confirmParam = searchParams.get("confirm");

    if (confirmParam !== "true") {
      return Response.json(
        {
          success: false,
          error: "Global history deletion requires explicit confirmation parameter (?confirm=true).",
        },
        { status: 400 }
      );
    }

    // ✅ First delete from queries (they reference responses)
    const { error: queryError } = await supabase
      .from("queries")
      .delete()
      .not("id", "is", null);
    if (queryError) throw queryError;

    // ✅ Then delete from responses
    const { error: responseError } = await supabase
      .from("responses")
      .delete()
      .not("id", "is", null);
    if (responseError) throw responseError;

    return Response.json({
      success: true,
      message: "✅ All query history cleared successfully!",
    });
  } catch (error) {
    console.error("Error clearing history:", error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}