"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import toast from "react-hot-toast";

export default function DocumentLibrary({ onSchemaMissing }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [analyzingId, setAnalyzingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [results, setResults] = useState({});
  const [embedStatus, setEmbedStatus] = useState({});

  // 🧩 Check embedding status for each document
  const checkEmbeddingStatus = useCallback(async (documents) => {
    try {
      const statuses = {};
      for (const doc of documents) {
        const res = await fetch(`/api/chunks?document_id=${doc.id}`);
        const data = await res.json();
        statuses[doc.id] = data.success && data.count > 0;
      }
      setEmbedStatus(statuses);
    } catch (err) {
      console.error("Error checking embeddings:", err);
    }
  }, []);

  // ✅ Fetch all uploaded documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.isSchemaMissing) {
        if (onSchemaMissing) onSchemaMissing(true);
        setDocs([]);
        return;
      }

      if (data.success) {
        setDocs(data.data || []);
        if (onSchemaMissing) onSchemaMissing(false);
        await checkEmbeddingStatus(data.data || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, [checkEmbeddingStatus, onSchemaMissing]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 🗑️ Delete document & chunks
  const handleDelete = async (doc) => {
    const confirmed = confirm(
      `Are you sure you want to delete "${doc.filename}"? This will remove the document and its embeddings permanently.`
    );
    if (!confirmed) return;

    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/documents?id=${doc.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Deleted ${doc.filename}`);
        setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      } else {
        toast.error(data.error || "Failed to delete document.");
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Network error while deleting document.");
    } finally {
      setDeletingId(null);
    }
  };

  // 🧠 Analyze document
  const analyzeDocument = async (doc) => {
    setAnalyzingId(doc.id);
    toast.loading(`Analyzing ${doc.filename}...`);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentText: doc.text,
          query: `Summarize and analyze key insights from ${doc.filename}`,
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

  // Filtered documents by search query
  const filteredDocs = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter((d) => d.filename?.toLowerCase().includes(q));
  }, [docs, searchQuery]);

  return (
    <div className="mt-8 pt-6 border-t border-gray-200/80 dark:border-gray-800">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            📚 Document Library
          </h2>
          <span className="text-xs bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
            {docs.length} {docs.length === 1 ? "file" : "files"}
          </span>
        </div>

        {docs.length > 3 && (
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {loading && docs.length === 0 && (
        <div className="flex items-center justify-center p-8 text-sm text-gray-500 dark:text-gray-400 gap-2">
          <span className="inline-block h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          Loading document catalog...
        </div>
      )}

      {!loading && docs.length === 0 && (
        <div className="text-center p-8 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40">
          <span className="text-3xl block mb-2">📂</span>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No documents in your vault yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Upload your first PDF above. It will be chunked, embedded with OpenAI vectors, and ready for semantic RAG queries.
          </p>
        </div>
      )}

      <AnimatePresence>
        {filteredDocs.map((doc) => {
          const isEmbedded = embedStatus[doc.id];

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="p-5 mb-4 rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 shadow-xs hover:shadow-md transition-all duration-200"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📄</span>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base truncate">
                      {doc.filename}
                    </h3>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 ml-7">
                    Added {new Date(doc.uploaded_at).toLocaleDateString()} at{" "}
                    {new Date(doc.uploaded_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* 🧩 Embedding Status Badge */}
                <div
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 ${
                    isEmbedded
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      : "bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isEmbedded ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  {isEmbedded ? "Vectorized" : "Pending Embed"}
                </div>
              </div>

              {/* Text Preview */}
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-3 mb-4 line-clamp-2 leading-relaxed bg-gray-50/70 dark:bg-gray-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/80 font-mono text-[11px]">
                {doc.text?.slice(0, 260) || "No text preview available."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                  title="Delete Document"
                >
                  {deletingId === doc.id ? "Deleting..." : "🗑️ Delete"}
                </button>

                <button
                  onClick={() => analyzeDocument(doc)}
                  disabled={analyzingId === doc.id}
                  className={`px-3.5 py-1.5 rounded-lg text-white text-xs font-medium transition cursor-pointer shadow-xs ${
                    analyzingId === doc.id
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {analyzingId === doc.id ? "Analyzing..." : "🔍 Quick Summary"}
                </button>

                <Link
                  href={`/pdf/${doc.id}`}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition inline-flex items-center gap-1"
                >
                  💬 Chat with Doc →
                </Link>
              </div>

              {/* 🧠 AI Summary */}
              {results[doc.id] && (
                <motion.div
                  key={`result-${doc.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-3.5 p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl"
                >
                  <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">
                    AI Summary:
                  </h4>
                  <p className="text-gray-800 dark:text-gray-200 text-xs leading-relaxed whitespace-pre-wrap">
                    {results[doc.id]}
                  </p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}