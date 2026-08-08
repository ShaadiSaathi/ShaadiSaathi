/**
 * Server-side wedding AI chat history (Admin SDK only).
 * Scoped by weddingId — never expose across families.
 */

import { getAdminDb } from "@/lib/server/firebase-admin"

export type WeddingChatCitation = { url: string; title: string }

export type WeddingChatHistoryRecord = {
  id: string
  weddingId: string
  userId: string
  question: string
  answer: string
  citations: WeddingChatCitation[]
  createdAt: number
}

const COLLECTION = "weddingChatHistory"
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 50

export async function saveWeddingChatExchange(input: {
  weddingId: string
  userId: string
  question: string
  answer: string
  citations: WeddingChatCitation[]
}): Promise<string> {
  const createdAt = Date.now()
  const ref = await getAdminDb().collection(COLLECTION).add({
    weddingId: input.weddingId,
    userId: input.userId,
    question: input.question,
    answer: input.answer,
    citations: input.citations,
    createdAt,
  })
  return ref.id
}

export async function listWeddingChatHistory(input: {
  weddingId: string
  limit?: number
  /** Exclusive cursor: createdAt of the last item from the previous page */
  cursor?: number | null
}): Promise<{
  items: WeddingChatHistoryRecord[]
  nextCursor: number | null
}> {
  const pageSize = Math.min(
    Math.max(1, input.limit ?? DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE
  )

  let query = getAdminDb()
    .collection(COLLECTION)
    .where("weddingId", "==", input.weddingId)
    .orderBy("createdAt", "desc")
    .limit(pageSize + 1)

  if (typeof input.cursor === "number" && Number.isFinite(input.cursor)) {
    query = query.startAfter(input.cursor)
  }

  const snap = await query.get()
  const docs = snap.docs
  const hasMore = docs.length > pageSize
  const pageDocs = hasMore ? docs.slice(0, pageSize) : docs

  const items: WeddingChatHistoryRecord[] = pageDocs.map((doc) => {
    const data = doc.data() as {
      weddingId?: string
      userId?: string
      question?: string
      answer?: string
      citations?: WeddingChatCitation[]
      createdAt?: number
    }
    return {
      id: doc.id,
      weddingId: typeof data.weddingId === "string" ? data.weddingId : "",
      userId: typeof data.userId === "string" ? data.userId : "",
      question: typeof data.question === "string" ? data.question : "",
      answer: typeof data.answer === "string" ? data.answer : "",
      citations: Array.isArray(data.citations)
        ? data.citations.filter(
            (c): c is WeddingChatCitation =>
              typeof c?.url === "string" && typeof c?.title === "string"
          )
        : [],
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    }
  })

  const last = items[items.length - 1]
  return {
    items,
    nextCursor: hasMore && last ? last.createdAt : null,
  }
}
