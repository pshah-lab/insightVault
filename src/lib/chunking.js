/**
 * Smart sentence-aware text chunking with sliding overlap.
 * Keeps semantic context intact across chunk boundaries for better vector retrieval.
 *
 * @param {string} text - Raw text to chunk
 * @param {number} chunkSize - Maximum target characters per chunk (default: 800)
 * @param {number} chunkOverlap - Overlap characters between consecutive chunks (default: 120)
 * @returns {string[]} Array of chunked text strings
 */
export function chunkText(text, chunkSize = 800, chunkOverlap = 120) {
  if (!text || typeof text !== "string") return [];

  // Normalize whitespace and split on sentence endings (. ? ! \n)
  const sentences = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.?!])\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [];

  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    // If a single sentence exceeds chunkSize, slice it cleanly
    if (sentence.length > chunkSize) {
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      for (let i = 0; i < sentence.length; i += chunkSize - chunkOverlap) {
        const piece = sentence.slice(i, i + chunkSize).trim();
        if (piece) chunks.push(piece);
      }
      continue;
    }

    if ((currentChunk + " " + sentence).length > chunkSize) {
      const trimmed = currentChunk.trim();
      if (trimmed) chunks.push(trimmed);

      // Create overlap from the tail of currentChunk
      const overlapText =
        trimmed.length > chunkOverlap
          ? trimmed.slice(trimmed.length - chunkOverlap)
          : trimmed;
      currentChunk = overlapText + " " + sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
