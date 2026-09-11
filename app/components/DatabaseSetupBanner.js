"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const SCHEMA_SQL = `-- Run in your Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  text TEXT,
  summary TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536)
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION match_chunks (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.2,
  match_count int DEFAULT 5,
  document_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  doc_id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id AS doc_id,
    dc.content,
    (1 - (dc.embedding <=> query_embedding))::float AS similarity
  FROM document_chunks dc
  WHERE (match_chunks.document_id IS NULL OR dc.document_id = match_chunks.document_id)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow application on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow application on document_chunks" ON document_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow application on queries" ON queries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow application on responses" ON responses FOR ALL USING (true) WITH CHECK (true);`;

export default function DatabaseSetupBanner({ onRetry }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL);
      toast.success("✅ SQL script copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full mb-6 p-4.5 rounded-2xl border border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-amber-50/90 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">⚡</span>
          <div>
            <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Supabase Database Setup Required
            </h3>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/80 mt-1 leading-relaxed max-w-xl">
              The required tables (<code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">documents</code>,{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">document_chunks</code>,{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">queries</code>) have not been created in your Supabase project yet.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 mt-3">
              <button
                onClick={copySql}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                📋 Copy Schema SQL
              </button>

              <button
                onClick={() => setExpanded(!expanded)}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-gray-700 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-medium transition cursor-pointer"
              >
                {expanded ? "Hide SQL Preview" : "View SQL Script"}
              </button>

              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
                >
                  🔄 Check Again
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-sm p-1 cursor-pointer"
          title="Dismiss banner"
        >
          ✕
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="relative">
              <pre className="p-3 bg-gray-950 text-gray-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                {SCHEMA_SQL}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
