"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function UploadPDF({ onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      toast.success(`Selected: ${selected.name}`);
    } else {
      toast.error("Please upload a valid PDF file.");
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("No file selected.");
    setUploading(true);
    setPreview("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Uploaded: ${data.filename}`);
        setPreview(data.textPreview);
        onUploadComplete?.(); // refresh documents in parent if needed
      } else {
        toast.error("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Something went wrong.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6 border border-gray-300 rounded-lg p-4 bg-white shadow-sm w-full max-w-md">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Upload PDF</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="block w-full mb-3 text-sm text-gray-700 border border-gray-300 rounded-md cursor-pointer focus:outline-none"
      />

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {uploading ? "Uploading..." : "Upload PDF"}
      </button>

      {preview && (
        <div className="mt-4 text-sm text-gray-700">
          <strong>Preview:</strong>
          <p className="mt-1 whitespace-pre-wrap">{preview}</p>
        </div>
      )}
    </div>
  );
}