import PDFParser from "pdf2json";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { openai, isOpenAIRateLimit, getOpenAIErrorMessage } from "@/src/lib/openaiClient";
import { generateEmbeddings } from "@/src/lib/embeddingClient";
import { supabase } from "@/src/lib/supabaseClient";
import { chunkText } from "@/src/lib/chunking";
import { checkRateLimit } from "@/src/lib/rateLimit";

export const dynamic = "force-dynamic"; // required for file uploads in Next.js

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_PAGES = 50; // Cap parsed pages to bound memory/CPU
const MAX_CHUNKS = 200; // Cap chunks to bound embedding budget

// 🧩 Helper: safely decode special characters
function decodeURIComponentSafe(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export async function POST(req) {
  // 🛡️ Rate limit check (max 10 uploads per IP per 10 minutes)
  const rateLimit = checkRateLimit(req, { limit: 10, windowMs: 10 * 60 * 1000, action: "upload" });
  if (!rateLimit.allowed) {
    return Response.json(
      { success: false, message: "Upload rate limit exceeded. Please wait before uploading more files." },
      { status: 429 }
    );
  }

  let tempPath = null;
  let insertedDocumentId = null;

  try {
    // 1️⃣ Receive file
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    // 🛡️ Pre-buffering size validation
    if (file.size && file.size > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, message: "File exceeds the 25 MB limit." },
        { status: 413 }
      );
    }

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_FILE_SIZE) {
      return Response.json(
        { success: false, message: "File exceeds the 25 MB limit." },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(bytes);

    // 🛡️ Magic-bytes verification: ensure header starts with '%PDF-'
    if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return Response.json(
        { success: false, message: "Invalid file: uploaded file is not a valid PDF document." },
        { status: 400 }
      );
    }

    // 🛡️ Sanitize filename against directory traversal
    const rawName = typeof file.name === "string" ? file.name : "document.pdf";
    const sanitizedFilename = path.basename(rawName).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 150);

    // 2️⃣ Write to isolated temp path to avoid concurrent upload collisions
    const uniqueId = crypto.randomUUID();
    tempPath = path.join(os.tmpdir(), `upload-${uniqueId}.pdf`);
    await fs.promises.writeFile(tempPath, buffer);

    // 3️⃣ Extract text using pdf2json with page bound
    const text = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          const pages = (pdfData.Pages || []).slice(0, MAX_PAGES);
          const extracted = pages
            .map((p) =>
              p.Texts.map((t) =>
                decodeURIComponentSafe(t.R.map((r) => r.T).join(""))
              ).join(" ")
            )
            .join("\n");
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
      .insert([{ filename: sanitizedFilename, text }])
      .select("id, filename")
      .single();

    if (docError) throw docError;
    insertedDocumentId = docData.id;

    // 5️⃣ Smart Chunking with overlap and maximum count cap
    let chunks = chunkText(text, 800, 120);
    if (chunks.length > MAX_CHUNKS) {
      console.warn(`⚠️ Truncating chunks from ${chunks.length} to ${MAX_CHUNKS} for ${sanitizedFilename}`);
      chunks = chunks.slice(0, MAX_CHUNKS);
    }
    console.log(`📘 Processing ${chunks.length} chunks in batch for ${sanitizedFilename}`);

    // 6️⃣ Batch Embeddings (batches of up to 100 chunks per request)
    const BATCH_SIZE = 100;
    const allChunkRecords = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const slice = chunks.slice(i, i + BATCH_SIZE);
      const { vectors, provider } = await generateEmbeddings(slice);
      console.log(`✨ Generated ${vectors.length} embeddings using ${provider}`);

      for (let j = 0; j < slice.length; j++) {
        allChunkRecords.push({
          document_id: insertedDocumentId,
          content: slice[j],
          embedding: vectors[j],
        });
      }
    }

    // Bulk insert all chunk embeddings into Supabase
    if (allChunkRecords.length > 0) {
      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert(allChunkRecords);

      if (chunkError) {
        console.error("❌ Failed to bulk insert document chunks:", chunkError);
        throw chunkError;
      }
    }

    // ✅ Done
    return Response.json({
      success: true,
      message: "✅ PDF uploaded, parsed, and embedded successfully!",
      filename: sanitizedFilename,
      documentId: insertedDocumentId,
      chunks: chunks.length,
      textPreview: text.slice(0, 200),
    });
  } catch (error) {
    console.error("🚨 RAG Upload Error:", error);

    // 🔄 Atomic Rollback: Clean up orphaned document record if chunk insertion failed
    if (insertedDocumentId) {
      try {
        console.warn(`🔄 Rolling back document ${insertedDocumentId} after failure`);
        await supabase.from("documents").delete().eq("id", insertedDocumentId);
      } catch (rollbackErr) {
        console.error("Failed rollback cleanup on documents:", rollbackErr.message);
      }
    }

    if (isOpenAIRateLimit(error)) {
      return Response.json(
        {
          success: false,
          isRateLimit: true,
          message: getOpenAIErrorMessage(error),
          error: error.message || "OpenAI rate limit exceeded",
        },
        { status: 429 }
      );
    }

    return Response.json(
      {
        success: false,
        message: error.message || "Failed to process and embed PDF.",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    // Guaranteed temp file cleanup
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        await fs.promises.unlink(tempPath);
      } catch (cleanupErr) {
        console.warn("⚠️ Failed to remove temp file:", cleanupErr.message);
      }
    }
  }
}