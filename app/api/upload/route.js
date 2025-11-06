import PDFParser from "pdf2json";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { supabase } from "@/src/lib/supabaseClient";

export const dynamic = "force-dynamic"; // required for file uploads in Next.js

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧩 Helper: safely decode special characters
function decodeURIComponentSafe(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

// 🧩 Helper: chunk long text into 1000-character blocks
function chunkText(text, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function POST(req) {
  try {
    // 1️⃣ Receive file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file)
      return Response.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2️⃣ Write to temp path
    const tempPath = path.join(process.cwd(), "temp.pdf");
    await fs.promises.writeFile(tempPath, buffer);

    // 3️⃣ Extract text using pdf2json
    const text = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          const extracted = pdfData.Pages.map((p) =>
            p.Texts.map((t) =>
              decodeURIComponentSafe(t.R.map((r) => r.T).join(""))
            ).join(" ")
          ).join("\n");
          resolve(extracted);
        } catch (err) {
          reject(err);
        }
      });
      pdfParser.loadPDF(tempPath);
    });

    if (!text || text.trim().length < 50) {
      throw new Error("PDF text extraction failed or resulted in too little text.");
    }

    // 4️⃣ Insert document metadata
    const { data: docData, error: docError } = await supabase
      .from("documents")
      .insert([{ filename: file.name,  text }])
      .select("id, filename")
      .single();

    if (docError) throw docError;
    const documentId = docData.id;

    // 5️⃣ Chunk text and embed each chunk
    const chunks = chunkText(text);
    console.log(`📘 Processing ${chunks.length} chunks for ${file.name}`);

    for (const [index, chunk] of chunks.entries()) {
      try {
        // Generate embedding
        const embeddingRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
        });

        const embedding = embeddingRes.data[0].embedding;

        // Store in Supabase
        const { error: chunkError } = await supabase
          .from("document_chunks")
          .insert([
            {
              document_id: documentId,
              content: chunk,
              embedding,
            },
          ]);

        if (chunkError)
          console.error(`❌ Failed to insert chunk ${index + 1}:`, chunkError);
      } catch (err) {
        console.error(`⚠️ Embedding error for chunk ${index + 1}:`, err.message);
      }
    }

    // 6️⃣ Delete temp file
    await fs.promises.unlink(tempPath);

    // ✅ Done
    return Response.json({
      success: true,
      message: "✅ PDF uploaded, parsed, and embedded successfully!",
      filename: file.name,
      documentId,
      chunks: chunks.length,
      textPreview: text.slice(0, 200),
    });
  } catch (error) {
    console.error("🚨 RAG Upload Error:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}