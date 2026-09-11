-- ==============================================================================
-- InsightVault: Supabase Vector & RAG Database Schema
-- ==============================================================================
-- Run this SQL in your Supabase project's SQL Editor (https://supabase.com/dashboard)

-- 1. Enable pgvector extension for high-dimensional vector search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documents table for uploaded PDFs and file metadata
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  text TEXT,
  summary TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Document chunks table for text segments and 1536-dim OpenAI embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536)
);

-- 4. Create an HNSW index for fast vector similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 5. Responses table to record AI completions and latency metrics
CREATE TABLE IF NOT EXISTS responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Queries table to record user prompts linked to responses
CREATE TABLE IF NOT EXISTS queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Cosine similarity RPC function for RAG semantic search
-- (Note: Output column is named 'doc_id' to prevent PostgreSQL parameter collision with input 'document_id')
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
LANGUAGE plpgsql
AS $$
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

-- 8. Enable Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- 🛡️ Base Application Policies (Enables API operations while RLS is enforced)
CREATE POLICY "Allow application on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow application on document_chunks" ON document_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow application on queries" ON queries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow application on responses" ON responses FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 9. (Optional) Multi-Tenant Isolation via Supabase Auth
-- ------------------------------------------------------------------------------
-- When transitioning from single-vault to multi-user accounts, run:
--
-- ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
-- ALTER TABLE queries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
--
-- DROP POLICY IF EXISTS "Allow application on documents" ON documents;
-- CREATE POLICY "User isolated documents" ON documents FOR ALL 
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--
-- DROP POLICY IF EXISTS "Allow application on queries" ON queries;
-- CREATE POLICY "User isolated queries" ON queries FOR ALL 
--   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

