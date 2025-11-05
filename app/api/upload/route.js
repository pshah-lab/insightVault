import PDFParser from "pdf2json";
import fs from "fs";
import path from "path";
import { supabase } from "@/src/lib/supabaseClient";

export const dynamic = "force-dynamic"; // for form uploads

export async function POST(req) {
  try {
    // 1️⃣ Get file
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) {
      return Response.json(
        { success: false, message: "No file uploaded" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 2️⃣ Save temporarily
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    const tempPath = path.join(uploadDir, file.name);
    await fs.promises.writeFile(tempPath, buffer);

    // 3️⃣ Parse PDF
    const text = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));
      pdfParser.on("pdfParser_dataReady", (pdfData) => {
        try {
          const joined = pdfData.Pages.map((p) =>
            p.Texts.map((t) =>
              decodeURIComponentSafe(t.R.map((r) => r.T).join(""))
            ).join(" ")
          ).join("\n");
          resolve(joined);
        } catch (err) {
          reject(err);
        }
      });
      pdfParser.loadPDF(tempPath);
    });

    // 4️⃣ Insert into Supabase (✅ correct columns)
    const { data, error } = await supabase
      .from("documents")
      .insert([
        {
          filename: file.name,
          text: text,
          uploaded_at: new Date().toISOString(),
          summary: null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 5️⃣ Cleanup temp file
    await fs.promises.unlink(tempPath);

    // ✅ Success
    return Response.json({
      success: true,
      message: "✅ PDF uploaded and parsed successfully!",
      filename: file.name,
      documentId: data.id,
      textPreview: text.slice(0, 400),
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// 🔹 Safe URI decode
function decodeURIComponentSafe(text) {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}