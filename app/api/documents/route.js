import { supabase } from "@/src/lib/supabaseClient";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// 📜 GET documents (all or by id)
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id && !UUID_REGEX.test(id)) {
      return Response.json(
        { success: false, error: "Invalid document ID format." },
        { status: 400 }
      );
    }

    let query = supabase
      .from("documents")
      .select("id, filename, text, uploaded_at, summary")
      .order("uploaded_at", { ascending: false });

    if (id) {
      query = query.eq("id", id);
    } else {
      query = query.limit(50); // Bound results to avoid unbounded memory dumps
    }

    const { data, error } = await query;

    if (error) throw error;

    return Response.json({ success: true, data });
  } catch (err) {
    const isSchemaMissing =
      err.message?.includes("schema cache") ||
      err.message?.includes("relation") ||
      err.message?.includes("does not exist");

    console.error("❌ Error fetching documents:", err.message);
    return Response.json(
      {
        success: false,
        isSchemaMissing,
        error: isSchemaMissing
          ? "Supabase tables not initialized. Please run supabase-schema.sql in your Supabase SQL editor."
          : err.message,
      },
      { status: isSchemaMissing ? 200 : 500 }
    );
  }
}

// 📝 PATCH — update summary or metadata for a document
export async function PATCH(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, summary } = body;

    if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
      return Response.json(
        { success: false, error: "Valid Document ID (UUID) is required." },
        { status: 400 }
      );
    }

    const updates = {};
    if (summary) {
      if (typeof summary !== "string" || summary.length > 10000) {
        return Response.json(
          { success: false, error: "Summary must be a string under 10,000 characters." },
          { status: 400 }
        );
      }
      updates.summary = summary;
    }

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

// 🗑️ DELETE — delete document and all its embedded chunks
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
      return Response.json(
        { success: false, error: "Valid Document ID (UUID) is required." },
        { status: 400 }
      );
    }

    // 1️⃣ Delete chunks associated with this document
    const { error: chunksError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", id);

    if (chunksError) {
      console.warn("⚠️ Warning deleting document chunks:", chunksError.message);
    }

    // 2️⃣ Delete the document record itself
    const { error: docError } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (docError) throw docError;

    return Response.json({
      success: true,
      message: "Document and its chunks deleted successfully.",
    });
  } catch (err) {
    console.error("❌ Error deleting document:", err.message);
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}