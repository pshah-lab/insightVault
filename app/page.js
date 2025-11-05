"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QueryHistory from "./components/QueryHistory";
import toast from "react-hot-toast";
import LoadingShimmer from "./components/LoadingShimmer";

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  // ✅ Fetch history
  const fetchHistory = async () => {
    try {
      setRefreshingHistory(true);
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) setHistory(data.data || []);
      else setHistory([]);
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistory([]);
    } finally {
      setRefreshingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // ✅ Submit a new query
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (data.success) {
        setResponse(data.data?.response || data.message);
        toast.success("Query processed successfully!");
        fetchHistory(); // 🔁 Refresh history after new query
      } else {
        setError(data.message || "Failed to get a response");
        toast.error("Error: " + (data.message || "Failed to process query"));
      }
    } catch (err) {
      setError("Network error. Please try again later.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Clear all history
  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      const data = await res.json();
  
      if (data.success) {
        toast.success("History cleared successfully!");
        setHistory([]); // triggers slide-out animation
      } else {
        toast.error("Failed to clear history: " + data.error);
      }
    } catch (err) {
      toast.error("Error while clearing history.");
      console.error(err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl font-bold mb-6 text-gray-800"
      >
        InsightVault Assistant
      </motion.h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <textarea
          className="w-full text-black p-3 border border-gray-300 rounded-lg focus:ring focus:ring-blue-300 mb-4"
          rows="4"
          placeholder="Ask InsightVault anything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Thinking..." : "Submit Query"}
        </button>
      </form>

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {/* ✨ Animated fade-in for response */}
      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingShimmer key="loading" />
        ) : (
          response && (
            <motion.div
              key={response}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mt-6 p-4 bg-white border rounded-lg shadow max-w-md w-full"
            >
              <h2 className="font-semibold mb-2 text-gray-800">Response:</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* 🧩 Query History */}
      <AnimatePresence>
        {!refreshingHistory && history.length > 0 && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5 }}
            className="w-full mt-10 flex justify-center"
          >
            <QueryHistory history={history} onClear={handleClearHistory} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}