import { supabase } from "@/src/lib/supabaseClient";

// 📜 GET documents (all or by id)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let query = supabase
      .from("documents")
      .select("id, filename, text, uploaded_at, summary");

    if (id) query = query.eq("id", id);

    const { data, error } = await query.order("uploaded_at", { ascending: false });

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching documents:", err.message);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}