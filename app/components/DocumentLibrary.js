"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

export default function DocumentLibrary() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [results, setResults] = useState({});

  // ✅ Fetch all uploaded documents
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) setDocs(data.data || []);
      else toast.error("Failed to load documents.");
    } catch (err) {
      console.error("Error fetching documents:", err);
      toast.error("Network error while loading documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 🧠 Analyze document summary
  const analyzeDocument = async (doc) => {
    setAnalyzingId(doc.id);
    toast.loading(`Analyzing ${doc.filename}...`);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: doc.text,
          query: `Summarize and analyze the key insights from ${doc.filename}`,
        }),
      });

      const data = await res.json();
      toast.dismiss();

      if (data.success) {
        toast.success(`Analysis complete for ${doc.filename}`);
        setResults((prev) => ({
          ...prev,
          [doc.id]: data.data.response,
        }));
      } else {
        toast.error(`Failed: ${data.message || "AI analysis failed"}`);
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Network error while analyzing document.");
      console.error(err);
    } finally {
      setAnalyzingId(null);
    }
  };

  if (loading)
    return (
      <p className="text-sm text-gray-500 mt-4">Loading documents...</p>
    );

  if (docs.length === 0)
    return (
      <p className="text-sm text-gray-500 mt-4">
        No documents uploaded yet.
      </p>
    );

  return (
    <div className="mt-10 border-t pt-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        📚 Uploaded Documents
      </h2>

      <AnimatePresence>
        {docs.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="p-5 mb-5 border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-lg transition-all"
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-800">{doc.filename}</h3>
                <p className="text-xs text-gray-400">
                  Uploaded on {new Date(doc.uploaded_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(doc.text || "");
                  toast.success("Document text copied!");
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Copy Text
              </button>
            </div>

            {/* Text Preview */}
            <p className="text-sm text-gray-700 mt-3 mb-4 line-clamp-3">
              {doc.text?.slice(0, 300) || "No text extracted."}
            </p>

            {/* ✅ Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={() => analyzeDocument(doc)}
                disabled={analyzingId === doc.id}
                className={`px-5 py-2 rounded-lg text-white font-medium transition-all ${
                  analyzingId === doc.id
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg"
                }`}
              >
                {analyzingId === doc.id ? "Analyzing..." : "🔍 Analyze with AI"}
              </button>

              <Link
                href={`/pdf/${doc.id}`}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-medium shadow-md hover:bg-indigo-700 transition-all"
              >
                💬 Open Chat
              </Link>
            </div>

            {/* 🧠 AI Summary */}
            {results[doc.id] && (
              <motion.div
                key={`result-${doc.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-inner"
              >
                <h4 className="text-sm font-semibold text-blue-700 mb-1">
                  AI Summary:
                </h4>
                <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                  {results[doc.id]}
                </p>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}