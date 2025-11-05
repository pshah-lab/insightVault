"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function QueryHistory({ history = [], onClear }) {
  if (!history.length) return null;

  const handleClear = async () => {
    const confirmed = confirm("Are you sure you want to delete all query history?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        onClear(); // Refresh parent
      } else {
        alert("⚠️ Failed to clear history: " + data.error);
      }
    } catch (err) {
      alert("Network error while clearing history.");
      console.error(err);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="history-box"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-10 w-full max-w-2xl bg-white p-4 rounded-lg shadow border"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Query History</h2>
          <button
            onClick={handleClear}
            className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md transition"
          >
            🧹 Clear History
          </button>
        </div>

        <ul className="space-y-4 max-h-96 overflow-y-auto">
          {history.map((item) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
              className="border-b border-gray-200 pb-2 last:border-none"
            >
              <p className="font-medium text-gray-800">
                Q: {item.question}
              </p>
              {item.responses && (
                <p className="text-gray-600 mt-1">
                  A: {item.responses.content}
                </p>
              )}
              <span className="text-xs text-gray-400 block mt-1">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}