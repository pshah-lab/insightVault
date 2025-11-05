"use client";

import toast from "react-hot-toast";
import { useState } from "react";

export default function QueryHistory({ history = [], onClear }) {
  const [clearing, setClearing] = useState(false);

  if (!history.length)
    return (
      <div className="mt-10 w-full max-w-2xl bg-white p-4 rounded-lg shadow border text-center text-gray-500">
        No query history yet.
      </div>
    );

  const handleClear = async () => {
    const confirmed = confirm(
      "Are you sure you want to delete all query history?"
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("History cleared successfully!");
        onClear(); // ✅ refresh parent
      } else {
        toast.error(
          "Failed to clear history: " + (data.error || "Unknown error")
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while clearing history.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="mt-10 w-full max-w-2xl bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800">Query History</h2>
        <button
          onClick={handleClear}
          disabled={clearing}
          className={`text-sm px-3 py-1 rounded-md transition ${
            clearing
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {clearing ? "Clearing..." : "🧹 Clear History"}
        </button>
      </div>

      <ul className="space-y-4 max-h-96 overflow-y-auto">
        {history.map((item) => (
          <li
            key={item.id}
            className="border-b border-gray-200 pb-2 last:border-none"
          >
            <p className="font-medium text-gray-800">Q: {item.question}</p>
            {item.responses && (
              <p className="text-gray-600 mt-1">A: {item.responses.content}</p>
            )}
            <span className="text-xs text-gray-400 block mt-1">
              {new Date(item.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
