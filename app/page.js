"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import UploadPDF from "./components/UploadPDF";
import DocumentLibrary from "./components/DocumentLibrary";
import DatabaseSetupBanner from "./components/DatabaseSetupBanner";
import LoadingShimmer from "./components/LoadingShimmer";
import ThemeToggle from "./components/ThemeToggle";

const SUGGESTIONS = [
  "Summarize key insights and executive conclusions",
  "Identify top risks, limitations, and anomalies",
  "Extract quantitative metrics, stats, and milestones",
  "List actionable recommendations from the uploaded documents",
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function Home() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [provider, setProvider] = useState("");
  const [sources, setSources] = useState([]);
  const [latency, setLatency] = useState(null);
  const [showSources, setShowSources] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [refreshDocs, setRefreshDocs] = useState(0);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.isSchemaMissing) {
        setSchemaMissing(true);
        setHistory([]);
        return;
      }
      setHistory(data.success ? data.data || [] : []);
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setError("");
    setResponse("");
    setSources([]);
    setLatency(null);
    setShowSources(false);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.message || "Failed to process query.");
        toast.error(data.message || "Failed to process query.");
        return;
      }

      setResponse(data.data?.response || data.message);
      setSources(data.data?.sources || []);
      setLatency(data.data?.latency_ms || null);
      setProvider(data.data?.provider || "");
      toast.success("Response ready");
      fetchHistory();
    } catch {
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/history?confirm=true", { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setHistory([]);
        toast.success("History cleared");
      } else {
        toast.error(data.error || "Failed to clear history");
      }
    } catch (err) {
      toast.error("Error while clearing history");
      console.error(err);
    }
  };

  const copyResponse = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const selectHistory = (item) => {
    setActiveTab("chat");
    setQuery(item.question || "");
    setMobileSidebar(false);
  };

  const sidebar = (
    <div className="iv-sidebar-inner">
      <div className="iv-brand-row">
        <div className="iv-brand-mark">IV</div>
        <div>
          <div className="iv-brand-name">InsightVault</div>
          <div className="iv-brand-caption">Research workspace</div>
        </div>
        <button className="iv-icon-button iv-mobile-close" onClick={() => setMobileSidebar(false)} aria-label="Close navigation">x</button>
      </div>

      <div className="iv-sidebar-label">Workspace</div>
      <nav className="iv-nav" aria-label="Workspace navigation">
        <button className={`iv-nav-item ${activeTab === "chat" ? "is-active" : ""}`} onClick={() => { setActiveTab("chat"); setMobileSidebar(false); }}>
          <span className="iv-nav-symbol">/</span><span>Query assistant</span><span className="iv-nav-count">01</span>
        </button>
        <button className={`iv-nav-item ${activeTab === "vault" ? "is-active" : ""}`} onClick={() => { setActiveTab("vault"); setMobileSidebar(false); }}>
          <span className="iv-nav-symbol">+</span><span>Document vault</span><span className="iv-nav-count">02</span>
        </button>
      </nav>

      <div className="iv-sidebar-rule" />
      <div className="iv-history-heading"><span className="iv-sidebar-label">Recent questions</span>{history.length > 0 && <button className="iv-text-button" onClick={handleClearHistory}>Clear</button>}</div>
      <div className="iv-history-list">
        {history.slice(0, 7).map((item) => (
          <button className="iv-history-item" key={item.id} onClick={() => selectHistory(item)}>
            <span className="iv-history-question">{item.question}</span><span className="iv-history-date">{formatDate(item.created_at)}</span>
          </button>
        ))}
        {!history.length && <p className="iv-history-empty">Your saved questions will appear here.</p>}
      </div>

      <div className="iv-sidebar-footer"><div className="iv-status-dot" /><div><strong>RAG engine online</strong><span>Grounded answers enabled</span></div></div>
    </div>
  );

  return (
    <div className="iv-app-shell">
      <aside className="iv-sidebar">{sidebar}</aside>
      <AnimatePresence>
        {mobileSidebar && (
          <motion.div className="iv-mobile-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileSidebar(false)}>
            <motion.aside className="iv-mobile-sidebar" initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} onClick={(event) => event.stopPropagation()}>{sidebar}</motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="iv-main">
        <header className="iv-topbar">
          <div className="iv-topbar-left">
            <button className="iv-menu-button" onClick={() => setMobileSidebar(true)} aria-label="Open navigation"><span /><span /></button>
            <div className="iv-breadcrumb"><span>Workspace</span><b>/</b><strong>{activeTab === "chat" ? "Query assistant" : "Document vault"}</strong></div>
          </div>
          <div className="iv-topbar-actions"><span className="iv-live-status"><span /> Live system</span><ThemeToggle /></div>
        </header>

        <div className="iv-content">
          {schemaMissing && <DatabaseSetupBanner onRetry={() => { fetchHistory(); setRefreshDocs((n) => n + 1); }} />}

          <section className="iv-page-intro">
            <div><p className="iv-kicker">Private intelligence layer <span>01</span></p><h1>Ask better questions<br /><em>of your own knowledge.</em></h1></div>
            <p className="iv-intro-copy">Search across your uploaded research, reports, and notes. Every answer stays anchored to the source material in your vault.</p>
          </section>

          <div className="iv-tab-strip" role="tablist" aria-label="Workspace views">
            <button className={activeTab === "chat" ? "is-active" : ""} onClick={() => setActiveTab("chat")} role="tab" aria-selected={activeTab === "chat"}>Query assistant <span>⌘ 1</span></button>
            <button className={activeTab === "vault" ? "is-active" : ""} onClick={() => setActiveTab("vault")} role="tab" aria-selected={activeTab === "vault"}>Document vault <span>⌘ 2</span></button>
          </div>

          {activeTab === "chat" ? (
            <section className="iv-chat-layout">
              <div className="iv-query-column">
                <div className="iv-section-meta"><span>Start a query</span><span className="iv-meta-line" /><span className="iv-muted">{query.length}/2000</span></div>
                <form className="iv-query-panel" onSubmit={handleSubmit}>
                  <textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); handleSubmit(); } }} placeholder="What would you like to understand?" rows="6" aria-label="Ask a question about your documents" />
                  <div className="iv-query-footer"><span>⌘ + Enter to run</span><button type="submit" disabled={loading || !query.trim()}>{loading ? "Working..." : "Run query"}<span>→</span></button></div>
                </form>
                <div className="iv-suggestion-block"><div className="iv-section-meta"><span>Try a starting point</span><span className="iv-meta-line" /></div><div className="iv-suggestion-list">{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => setQuery(suggestion)}><span>+</span>{suggestion}<b>↗</b></button>)}</div></div>
              </div>
              <aside className="iv-context-column">
                <div className="iv-context-card"><div className="iv-context-top"><span className="iv-kicker">Vault context</span><span className="iv-context-index">A1</span></div><div className="iv-context-number">{history.length.toString().padStart(2, "0")}</div><h2>questions<br />answered</h2><p>Your query history is kept close by so research can continue from the last useful thread.</p><div className="iv-context-footer"><span>Source-grounded</span><span className="iv-status-dot" /></div></div>
                <div className="iv-note-card"><span>Note</span><p>Responses are generated from the documents in your vault, not from a generic search index.</p></div>
              </aside>
            </section>
          ) : (
            <section className="iv-vault-view"><div className="iv-section-meta"><span>Ingest and manage</span><span className="iv-meta-line" /><span className="iv-muted">PDF / max 25 MB</span></div><UploadPDF onUploadComplete={() => setRefreshDocs((n) => n + 1)} /><DocumentLibrary key={refreshDocs} onSchemaMissing={setSchemaMissing} /></section>
          )}

          <AnimatePresence mode="wait">
            {activeTab === "chat" && loading && <LoadingShimmer key="loading" />}
            {activeTab === "chat" && error && <motion.div className="iv-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.div>}
            {activeTab === "chat" && response && !loading && <motion.section className="iv-response" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} key={response}>
              <div className="iv-response-head"><div><span className="iv-kicker">Vault intelligence</span><span className="iv-response-title">Response</span></div><div className="iv-response-metrics"><span>{provider || "AI"}</span>{latency !== null && <span>{latency}ms</span>}<button onClick={copyResponse}>Copy</button></div></div>
              <div className="iv-response-body">{response}</div>
              {sources.length > 0 && <div className="iv-sources"><button onClick={() => setShowSources(!showSources)}>{showSources ? "Hide" : "Inspect"} {sources.length} grounded sources <span>{showSources ? "−" : "+"}</span></button>{showSources && <div className="iv-source-list">{sources.map((source, index) => <div className="iv-source" key={source.id || index}><span>Source {String(index + 1).padStart(2, "0")}</span><p>{source.content}</p></div>)}</div>}</div>}
            </motion.section>}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
