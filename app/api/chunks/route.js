import { supabase } from "@/src/lib/supabaseClient";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("document_id");

    if (!documentId)
      return Response.json({ success: false, error: "Missing document_id" });

    const { count, error } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (error) throw error;

    return Response.json({ success: true, count });
  } catch (err) {
    console.error("Error checking document chunks:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}