/**
 * Wedding knowledge base — RAG architecture (proposal for next pass).
 *
 * Context
 * -------
 * Shaadi Saathi already uses Anthropic (`app/api/chat`) for Refine Max and
 * gates family paid features via `usePremium().isFamilyPremium`. There is no
 * embedding or vector dependency yet; Firestore has no vector indexes.
 *
 * Recommended stack (compatible with Firebase + current Anthropic chat)
 * --------------------------------------------------------------------
 * 1. Source of truth: versioned JSON under `lib/knowledge/data/` (this POC).
 *    Optionally mirror published entries into a Firestore `knowledge_entries`
 *    collection later for CMS edits — not required for v1.
 *
 * 2. Chunking: one WeddingKnowledgeEntry → multiple text chunks, e.g.
 *    - `{id}::overview` (notes + community)
 *    - `{id}::ceremony::{eventId}`
 *    - `{id}::decor::{themeId}`
 *    - `{id}::trends::{year}`
 *    Each chunk stores `sourceUrls` for citation in the UI.
 *
 * 3. Embeddings: Anthropic does not expose a first-party embeddings API in the
 *    same way OpenAI does. Practical options:
 *    A. OpenAI `text-embedding-3-small` (or Voyage) → vectors in an external DB
 *    B. Keep KB small and use hybrid keyword + LLM rerank (good enough for POC)
 *    Prefer A once we scale past South Asian.
 *
 * 4. Vector store (pick one):
 *    - **Upstash Vector** or **Pinecone** — lightest ops, works from Vercel
 *      route handlers; recommended default.
 *    - **Firestore vector search** — only if we want everything in Firebase and
 *      are ready to add vector indexes + embedding write pipeline. Heavier
 *      than we need for a static cultural KB.
 *
 * 5. Query path (premium-gated):
 *    Client → `POST /api/wedding-chat` (new; do not overload Refine `/api/chat`)
 *      → require Firebase Auth + `wedding.isPremium` (same source as PremiumContext)
 *      → embed question → top-k chunks → build system prompt:
 *         "Answer only from CONTEXT. If missing, say you don't know.
 *          Never invent prices. Cite sourceUrls."
 *      → Anthropic messages.create with CONTEXT + user question
 *      → return `{ answer, citations: sourceUrls[] }`
 *
 * 6. Grounding rules
 *    - No vendor prices, package deals, or "guaranteed" ritual order outside KB.
 *    - Flag `trendsByYear[].anecdotal === true` as "community / anecdotal".
 *    - Always return `sourceUrls` for "Learn more" links — we summarize, we
 *      do not claim original ethnography.
 *
 * 7. Premium UX
 *    - Gate with `isFamilyPremium`; free users see Upgrade CTA
 *      (`/upgrade?feature=wedding-ai` pattern used by seating/themes).
 *
 * Out of scope for this pass: chat UI, embeddings job, vector provisioning.
 */

export const WEDDING_KB_RAG_SUMMARY = {
  vectorStore: "upstash-vector-with-builtin-embedding-model",
  llm: "anthropic-claude-via-existing-sdk",
  premiumGate: "assertFamilyWeddingPremium → weddings.isPremium",
  apiRoute: "/api/wedding-chat",
  testUi: "/wedding-ai",
  embedScript: "npm run knowledge:embed",
  dataPath: "lib/knowledge/data/",
  envVars: ["UPSTASH_VECTOR_REST_URL", "UPSTASH_VECTOR_REST_TOKEN", "ANTHROPIC_API_KEY"],
} as const
