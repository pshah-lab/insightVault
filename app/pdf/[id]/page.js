"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function PDFChatPage() {
  const { id } = useParams();
  const router = useRouter();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [asking, setAsking] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [summary, setSummary] = useState("");

  // ✅ Fetch document by ID
  const fetchDoc = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents?id=${id}`);
      const data = await res.json();

      if (data.success && data.data.length > 0) {
        setDoc(data.data[0]);
        setSummary(data.data[0].summary || "");
      } else {
        toast.error("Document not found.");
        router.push("/");
      }
    } catch (err) {
      console.error("Error fetching document:", err);
      toast.error("Error loading document.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  // 🧠 Generate AI summary (RAG-powered)
  const generateSummary = async () => {
    if (!doc) return;
    setAnalyzing(true);
    toast.loading("Generating summary...");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `Summarize and analyze the document "${doc.filename}" clearly and concisely.`,
          documentId: doc.id,
        }),
      });

      const data = await res.json();
      toast.dismiss();

      if (data.success) {
        setSummary(data.data.response);
        toast.success("Summary generated!");

        // Persist summary in Supabase
        await fetch("/api/documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc.id, summary: data.data.response }),
        });
      } else {
        toast.error(data.message || data.error || "Failed to summarize document.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while summarizing.");
    } finally {
      setAnalyzing(false);
    }
  };

  // 💬 Ask question about the document
  const handleAsk = async () => {
    if (!chatInput.trim() || asking) return;
    if (!doc) return;

    const question = chatInput.trim();
    const userMsg = { role: "user", content: question };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");
    setAsking(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: question,
          documentId: doc.id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMsg = {
          role: "assistant",
          content: data.data.response,
          sources: data.data.sources || [],
          latency: data.data.latency_ms,
          provider: data.data.provider,
        };
        setChatHistory((prev) => [...prev, aiMsg]);
      } else {
        toast.error(data.message || "AI could not respond.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while chatting.");
    } finally {
      setAsking(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-600 dark:text-gray-400 text-sm">
        <span className="inline-block h-5 w-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mr-2" />
        Loading document...
      </div>
    );

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-[#0b0f19] dark:via-[#111827] dark:to-[#0f172a] text-gray-900 dark:text-gray-100 p-4 sm:p-6 transition-colors duration-300">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/")}
          className="px-3.5 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 transition font-medium cursor-pointer"
        >
          ← Back to Vault
        </button>
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate max-w-md">
          Chat: {doc.filename}
        </h1>
        <ThemeToggle />
      </div>

      {/* Main Chat Container */}
      <div className="w-full max-w-4xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xl p-5 sm:p-6 flex flex-col flex-1 min-h-[600px]">
        {/* Document Info */}
        <div className="border-b border-gray-200 dark:border-gray-700/80 pb-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {doc.filename}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Uploaded on {new Date(doc.uploaded_at).toLocaleString()}
              </p>
            </div>

            <button
              onClick={generateSummary}
              disabled={analyzing}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition shadow-xs cursor-pointer ${
                analyzing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {analyzing ? "Analyzing..." : "🔍 Generate AI Summary"}
            </button>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
            {doc.text?.slice(0, 350) || "No preview available."}
          </p>
        </div>

        {/* Summary Section */}
        {summary && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4 mb-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1.5">
              Document Summary:
            </h3>
            <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          </motion.div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto space-y-3.5 mb-4 pr-1 scroll-smooth">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-sm">
              <span className="text-3xl mb-2">💬</span>
              Ask questions grounded directly in &ldquo;{doc.filename}&rdquo;
            </div>
          )}

          <AnimatePresence>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl text-sm max-w-[85%] ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-600 text-white rounded-tr-xs shadow-sm"
                    : "bg-gray-100 dark:bg-gray-900/80 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 rounded-tl-xs shadow-xs"
                }`}
              >
                <div className="font-semibold text-xs opacity-75 mb-1 flex items-center justify-between">
                  <span>{msg.role === "user" ? "You" : (msg.provider || "InsightVault AI")}</span>
                  {msg.latency && (
                    <span className="text-[10px] font-mono opacity-80">⚡ {msg.latency}ms</span>
                  )}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>

                {/* Citations Preview if Available */}
                {msg.sources && msg.sources.length > 0 && (
                  <details className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-800 text-xs">
                    <summary className="text-[11px] font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                      View {msg.sources.length} Retrieved Source Excerpts
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-1">
                      {msg.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2 bg-white/70 dark:bg-black/30 rounded-lg border border-gray-200 dark:border-gray-800 font-mono text-[10px] text-gray-600 dark:text-gray-400"
                        >
                          <div className="flex justify-between font-bold mb-0.5">
                            <span>Excerpt #{idx + 1}</span>
                            {s.similarity && <span>score: {s.similarity}</span>}
                          </div>
                          <p className="line-clamp-3">{s.content}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {asking && (
            <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-900/80 text-gray-500 dark:text-gray-400 text-sm max-w-[85%] rounded-tl-xs flex items-center gap-2">
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              Retrieving context and formulating answer...
            </div>
          )}
        </div>

        {/* Input Box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="Ask a question about this document..."
            disabled={asking}
            className="flex-1 bg-white dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAsk}
            disabled={asking || !chatInput.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium cursor-pointer shadow-sm"
          >
            {asking ? "Thinking..." : "Send"}
          </button>
        </div>
      </div>
    </main>
  );
}