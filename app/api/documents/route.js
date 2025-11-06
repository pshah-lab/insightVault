import { supabase } from "@/src/lib/supabaseClient";

// 📜 GET documents (all or by id)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let query = supabase
      .from("documents")
      .select("id, filename, text, uploaded_at, summary")
      .order("uploaded_at", { ascending: false });

    if (id) query = query.eq("id", id);

    const { data, error } = await query;

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error fetching documents:", err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

// 📝 PATCH — update summary or metadata for a document
export async function PATCH(req) {
  try {
    const { id, summary } = await req.json();

    if (!id)
      return Response.json(
        { success: false, error: "Document ID is required" },
        { status: 400 }
      );

    const updates = {};
    if (summary) updates.summary = summary;

    const { data, error } = await supabase
      .from("documents")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;

    return Response.json({
      success: true,
      message: "Document updated successfully",
      data,
    });
  } catch (err) {
    console.error("❌ Error updating document:", err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}