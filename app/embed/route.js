import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// 🧩 Helper — chunk text intelligently
function chunkText(text, chunkSize = 800) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += sentence + " ";
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// 🚀 POST: Generate & Store Embeddings for a Document
export async function POST(req) {
  try {
    const { documentId } = await req.json();
    if (!documentId) {
      return Response.json(
        { success: false, error: "documentId is required." },
        { status: 400 }
      );
    }

    // Step 1️⃣: Get document text
    const { data: docs, error: fetchError } = await supabase
      .from("documents")
      .select("id, content, filename")
      .eq("id", documentId)
      .single();

    if (fetchError || !docs)
      throw new Error("Document not found or failed to fetch.");

    const { content, filename } = docs;

    if (!content || content.trim().length < 100)
      throw new Error("Document content too short or empty.");

    // Step 2️⃣: Chunk text
    const chunks = chunkText(content);
    console.log(`📄 Splitting '${filename}' into ${chunks.length} chunks.`);

    // Step 3️⃣: Generate embeddings for each chunk
    const embeddingsResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    });

    const embeddings = embeddingsResponse.data.map((e, i) => ({
      document_id: documentId,
      content: chunks[i],
      embedding: e.embedding,
    }));

    // Step 4️⃣: Store embeddings in document_chunks table
    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(embeddings);

    if (insertError) throw insertError;

    return Response.json({
      success: true,
      message: `✅ ${embeddings.length} chunks embedded for '${filename}'`,
    });
  } catch (error) {
    console.error("❌ Embedding error:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}