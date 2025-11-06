"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

export default function PDFChatPage() {
  const { id } = useParams();
  const router = useRouter();

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [summary, setSummary] = useState("");

  // ✅ Fetch document by ID
  useEffect(() => {
    const fetchDoc = async () => {
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
    };
    fetchDoc();
  }, [id, router]);

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
          documentId: doc.id, // ✅ Use documentId instead of full text
        }),
      });

      const data = await res.json();
      toast.dismiss();

      if (data.success) {
        setSummary(data.data.response);
        toast.success("Summary generated!");

        // Optionally, save summary in Supabase
        await fetch("/api/documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: doc.id, summary: data.data.response }),
        });
      } else {
        toast.error("Failed to summarize document.");
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
    if (!chatInput.trim()) return toast.error("Please type your question.");
    if (!doc) return;

    const userMsg = { role: "user", content: chatInput };
    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput("");

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: chatInput,
          documentId: doc.id, // ✅ use RAG-based retrieval
        }),
      });

      const data = await res.json();

      if (data.success) {
        const aiMsg = { role: "assistant", content: data.data.response };
        setChatHistory((prev) => [...prev, aiMsg]);
      } else {
        toast.error(data.message || "AI could not respond.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while chatting.");
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-600 text-sm">
        Loading document...
      </div>
    );

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/")}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition"
        >
          ← Back
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800 truncate">
          Chat with: {doc.filename}
        </h1>
        <div />
      </div>

      {/* Main Chat Container */}
      <div className="w-full max-w-4xl bg-white/80 backdrop-blur-md rounded-2xl border shadow-xl p-6 flex flex-col flex-1">
        {/* Document Info */}
        <div className="border-b pb-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            {doc.filename}
          </h2>
          <p className="text-xs text-gray-400 mb-2">
            Uploaded on {new Date(doc.uploaded_at).toLocaleString()}
          </p>

          <p className="text-sm text-gray-700 line-clamp-3">
            {doc.text?.slice(0, 400) || "No preview available."}
          </p>

          <div className="mt-3 flex justify-end">
            <button
              onClick={generateSummary}
              disabled={analyzing}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition ${
                analyzing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {analyzing ? "Analyzing..." : "🔍 Generate Summary"}
            </button>
          </div>
        </div>

        {/* Summary Section */}
        {summary && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-4 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl"
          >
            <h3 className="text-sm font-semibold text-blue-700 mb-2">
              AI Summary:
            </h3>
            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          </motion.div>
        )}

        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          <AnimatePresence>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg text-sm max-w-[80%] ${
                  msg.role === "user"
                    ? "ml-auto bg-blue-100 text-gray-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                <strong>{msg.role === "user" ? "You: " : "AI: "}</strong>
                {msg.content}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Input Box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask something about this PDF..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm outline-none focus:ring focus:ring-blue-200"
          />
          <button
            onClick={handleAsk}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}