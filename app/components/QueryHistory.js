"use client";

import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function QueryHistory({ history = [], onClear }) {
  // 🪄 Empty state animation
  if (!history.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mt-10 text-center text-gray-500 italic"
      >
        No query history yet — start exploring insights ✨
      </motion.div>
    );
  }

  // 📋 Copy helper with toast feedback
  const copyText = async (text, label = "Text") => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(`${label} copied!`);
    } catch (e) {
      toast.error("Clipboard unavailable. Please try manually.");
    }
  };

  // 🧹 Clear all history
  const handleClear = async () => {
    const confirmed = confirm(
      "Are you sure you want to delete all query history?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("🧹 History cleared successfully!");
        onClear(); // refresh parent
      } else {
        toast.error("⚠️ Failed to clear history: " + data.error);
      }
    } catch (err) {
      toast.error("Network error while clearing history.");
      console.error(err);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="history-box"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="mt-10 w-full max-w-3xl bg-white/80 backdrop-blur p-5 sm:p-6 rounded-2xl shadow-xl border border-gray-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
            Query History
          </h2>
          <button
            onClick={handleClear}
            className="text-xs sm:text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md shadow-sm transition-all hover:scale-105 active:scale-95"
          >
            🧹 Clear History
          </button>
        </div>

        {/* History List */}
        <ul className="space-y-4 max-h-112 overflow-y-auto pr-1 scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {history.map((item) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Q/A Section */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 break-words">
                    Q: {item.question}
                  </p>
                  {item.responses && (
                    <p className="text-gray-700 mt-2 break-words">
                      A: {item.responses.content}
                    </p>
                  )}
                  <span className="text-xs text-gray-400 block mt-2">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Copy Buttons */}
                <div className="shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => copyText(item.question, "Question")}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50 text-gray-700 transition-all hover:scale-105 active:scale-95"
                    title="Copy question"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M7.5 3.75A2.25 2.25 0 0 1 9.75 1.5h8.25A2.25 2.25 0 0 1 20.25 3.75v8.25a2.25 2.25 0 0 1-2.25 2.25H9.75a2.25 2.25 0 0 1-2.25-2.25V3.75Z" />
                      <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h.75v6.75A3.75 3.75 0 0 0 10.5 15.75H17.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18V7.5Z" />
                    </svg>
                    Copy Q
                  </button>

                  {item.responses?.content && (
                    <button
                      onClick={() => copyText(item.responses.content, "Answer")}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border bg-white hover:bg-gray-50 text-gray-700 transition-all hover:scale-105 active:scale-95"
                      title="Copy answer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M7.5 3.75A2.25 2.25 0 0 1 9.75 1.5h8.25A2.25 2.25 0 0 1 20.25 3.75v8.25a2.25 2.25 0 0 1-2.25 2.25H9.75a2.25 2.25 0 0 1-2.25-2.25V3.75Z" />
                        <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h.75v6.75A3.75 3.75 0 0 0 10.5 15.75H17.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18V7.5Z" />
                      </svg>
                      Copy A
                    </button>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
