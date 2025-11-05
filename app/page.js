"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import QueryHistory from "./components/QueryHistory";
import UploadPDF from "./components/UploadPDF";
import DocumentLibrary from "./components/DocumentLibrary";
import toast from "react-hot-toast";
import LoadingShimmer from "./components/LoadingShimmer";
import ThemeToggle from "./components/ThemeToggle";

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  // ✅ Fetch query history
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

  // ✅ Submit a new natural query
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
        fetchHistory();
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

  // ✅ Clear query history
  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        toast.success("History cleared successfully!");
        setHistory([]);
      } else {
        toast.error("Failed to clear history: " + data.error);
      }
    } catch (err) {
      toast.error("Error while clearing history.");
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* 🧭 Sidebar (Desktop) */}
      <motion.aside
        animate={{ width: sidebarOpen ? 300 : 60 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="hidden md:flex flex-col bg-white/70 backdrop-blur-md border-r border-gray-200 shadow-lg h-full overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen ? (
            <h2 className="text-lg font-semibold text-gray-800">History</h2>
          ) : (
            <span className="font-bold text-blue-600 text-lg">IV</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            {sidebarOpen ? "⏴" : "⏵"}
          </button>
        </div>

        <div className="flex-1 p-3">
          <AnimatePresence>
            {sidebarOpen ? (
              <QueryHistory
                key="history-full"
                history={history}
                onClear={handleClearHistory}
              />
            ) : (
              <motion.div
                key="mini"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center mt-6 gap-4 text-gray-600"
              >
                <button
                  onClick={handleClearHistory}
                  title="Clear History"
                  className="p-2 hover:bg-red-100 text-red-500 rounded-lg"
                >
                  🧹
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* 📱 Sidebar (Mobile Overlay) */}
      <AnimatePresence>
        {mobileSidebar && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMobileSidebar(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0 left-0 h-full w-72 bg-white/80 backdrop-blur-md shadow-xl border-r border-gray-200 p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">History</h2>
                <button
                  onClick={() => setMobileSidebar(false)}
                  className="text-gray-500 hover:text-gray-700 text-lg"
                >
                  ✖
                </button>
              </div>
              <QueryHistory history={history} onClear={handleClearHistory} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 💬 Main Chat Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
        {/* Mobile Header */}
        <div className="w-full flex justify-between items-center md:hidden mb-4">
          <button
            onClick={() => setMobileSidebar(true)}
            className="bg-blue-600 text-white px-3 py-2 rounded-md shadow-md"
          >
            ☰
          </button>
          <h1 className="text-lg font-semibold text-gray-800">InsightVault</h1>
        </div>

        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        {/* 🧠 Main Query Interface */}
        <div className="w-full max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600">
              InsightVault Assistant
            </h1>
            <p className="mt-3 text-sm text-gray-600 max-w-2xl mx-auto">
              Ask data questions in natural language. We’ll analyze and respond
              with clear insights.
            </p>
          </motion.div>

          <div className="bg-white/80 backdrop-blur rounded-2xl border shadow-xl p-5 sm:p-6">
            {/* 📝 Query Form */}
            <form onSubmit={handleSubmit} className="w-full">
              <textarea
                className="w-full text-gray-900 placeholder:text-gray-400 p-4 border border-gray-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition shadow-sm"
                rows="4"
                placeholder="e.g. Summarize the top anomalies from last week's metrics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {query.length}/2000
                </span>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium shadow hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? (
                    <>
                      <span className="inline-block h-4 w-4 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                      Thinking...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75S21.75 6.615 21.75 12 17.385 21.75 12 21.75 2.25 17.385 2.25 12Zm12.03-3.53a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.25a.75.75 0 0 0 0 1.5h6.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3.25-3.25a.75.75 0 0 0 0-1.06l-3.25-3.25Z" />
                      </svg>
                      Submit
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* 📎 PDF Upload Section */}
            <div className="mt-6">
              <UploadPDF
                onUploadComplete={() =>
                  toast.success("Document parsed successfully!")
                }
              />
              <DocumentLibrary />
            </div>

            {/* 🧠 Response */}
            {error && (
              <p className="text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4 text-sm">
                {error}
              </p>
            )}

            <div className="mt-4">
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
                      className="p-4 bg-white border rounded-xl shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="font-semibold text-gray-800">
                          Response
                        </h2>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {response}
                      </p>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Query History (Bottom for Mobile View) */}
          <AnimatePresence>
            {!refreshingHistory && history.length > 0 && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5 }}
                className="w-full mt-10"
              >
                <QueryHistory history={history} onClear={handleClearHistory} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
