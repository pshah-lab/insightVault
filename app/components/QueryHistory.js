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
        className="mt-6 text-center text-gray-500 dark:text-gray-400 italic text-sm"
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
    } catch {
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
      const res = await fetch("/api/history?confirm=true", { method: "DELETE" });
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
        className="mt-6 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur p-4 sm:p-5 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700/80"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-100">
            Query History
          </h2>
          <button
            onClick={handleClear}
            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2.5 py-1.5 rounded-md shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            🧹 Clear
          </button>
        </div>

        {/* History List */}
        <ul className="space-y-3.5 max-h-112 overflow-y-auto pr-1 scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {history.map((item) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-50/70 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700/70 rounded-xl p-3.5 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Q/A Section */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 text-sm break-words">
                    Q: {item.question}
                  </p>
                  {item.responses && (
                    <p className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm mt-2 break-words leading-relaxed">
                      A: {item.responses.content}
                    </p>
                  )}
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-2">
                    {new Date(item.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Copy Buttons */}
                <div className="shrink-0 flex flex-col gap-1.5">
                  <button
                    onClick={() => copyText(item.question, "Question")}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    title="Copy question"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-3 w-3"
                    >
                      <path d="M7.5 3.75A2.25 2.25 0 0 1 9.75 1.5h8.25A2.25 2.25 0 0 1 20.25 3.75v8.25a2.25 2.25 0 0 1-2.25 2.25H9.75a2.25 2.25 0 0 1-2.25-2.25V3.75Z" />
                      <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h.75v6.75A3.75 3.75 0 0 0 10.5 15.75H17.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18V7.5Z" />
                    </svg>
                    Copy Q
                  </button>

                  {item.responses?.content && (
                    <button
                      onClick={() => copyText(item.responses.content, "Answer")}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                      title="Copy answer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-3 w-3"
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
