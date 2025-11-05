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
    console.error("Error fetching history:", error.message);
    return Response.json({ success: false, error: error.message });
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
        response_id: responseData.id, // ✅ Now the correct relationship
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

// 🧹 DELETE: Clear all history
export async function DELETE() {
  try {
    // First delete responses (since they reference queries)
    const { error: responseError } = await supabase
      .from("responses")
      .delete()
      .neq("id", 0);
    if (responseError) throw responseError;

    // Then delete queries
    const { error: queryError } = await supabase
      .from("queries")
      .delete()
      .neq("id", 0);
    if (queryError) throw queryError;

    return Response.json({
      success: true,
      message: "All query history cleared!",
    });
  } catch (error) {
    console.error("Error clearing history:", error.message);
    return Response.json({ success: false, error: error.message });
  }
}
