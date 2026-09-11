"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";

export default function UploadPDF({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      toast.error("Please select a valid PDF file.");
      return;
    }
    if (selectedFile.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25MB limit.");
      return;
    }
    setFile(selectedFile);
    setPreview("");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please choose a PDF to upload.");

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`✅ Embedded ${data.chunks} chunks for ${data.filename}!`);
        setPreview(data.textPreview || "");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        if (onUploadComplete) onUploadComplete();
      } else {
        toast.error(data.message || data.error || "Upload failed");
      }
    } catch (error) {
      toast.error("Network error while uploading PDF.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl p-5 border border-gray-200/90 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
          <span>📤</span> Ingest PDF to Vault
        </h3>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
          Smart RAG Embeddings
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40"
            : "border-gray-300 dark:border-gray-700/80 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50/60 dark:bg-gray-950/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-1.5">
          <span className="text-2xl">{file ? "📑" : "📄"}</span>
          {file ? (
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {file.name}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB • Ready to vectorize
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                PDF documents up to 25MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5 mt-3.5">
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {uploading ? (
            <>
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
              Vectorizing Chunks with OpenAI...
            </>
          ) : (
            "Process & Store in Vector DB"
          )}
        </button>

        {file && !uploading && (
          <button
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-medium transition cursor-pointer"
            title="Cancel selection"
          >
            Clear
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-3.5 p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-xs text-gray-700 dark:text-gray-300">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-[11px] uppercase tracking-wider mb-1">
            ✓ Successfully Vectorized Preview:
          </p>
          <p className="font-mono text-[11px] text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {preview}
          </p>
        </div>
      )}
    </div>
  );
}