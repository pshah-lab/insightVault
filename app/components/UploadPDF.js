"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function UploadPDF({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPreview(""); // clear old preview
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a PDF file first.");

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
        toast.success("✅ PDF uploaded successfully!");
        setPreview(data.textPreview || "");
        setFile(null);

        // 🟢 Notify parent to refresh document list
        if (onUploadComplete) onUploadComplete();
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (error) {
      toast.error("Network error while uploading PDF.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-white shadow-sm">
      <h2 className="text-md font-semibold mb-2 text-gray-800">Upload PDF</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="w-full text-sm text-gray-700 mb-3"
      />

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-blue-600 text-white py-2 rounded-md shadow hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {uploading ? "Uploading..." : "Upload PDF"}
      </button>

      {preview && (
        <div className="mt-3 text-sm text-gray-700">
          <p className="font-medium">Preview:</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-3">{preview}</p>
        </div>
      )}
    </div>
  );
}