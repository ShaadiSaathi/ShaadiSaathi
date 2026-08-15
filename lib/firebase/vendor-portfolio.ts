/**
 * Vendor past-work / portfolio items — captions, event tags, order.
 * photoUrls stays in sync as a denormalized URL list for older callers.
 */

import type { EventId } from "@/lib/mockData"

export const VENDOR_PORTFOLIO_MAX_IMAGES = 24
export const VENDOR_PORTFOLIO_CAPTION_MAX = 120
export const VENDOR_PORTFOLIO_EVENT_IDS = [
  "mehndi",
  "baraat",
  "walima",
] as const satisfies readonly EventId[]

export type VendorPortfolioEventId = (typeof VENDOR_PORTFOLIO_EVENT_IDS)[number]

export type VendorPortfolioItem = {
  id: string
  url: string
  caption?: string
  eventId?: VendorPortfolioEventId
  createdAt: number
}

export function isVendorPortfolioEventId(
  value: unknown
): value is VendorPortfolioEventId {
  return (
    typeof value === "string" &&
    (VENDOR_PORTFOLIO_EVENT_IDS as readonly string[]).includes(value)
  )
}

function newPortfolioId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Build portfolio items from legacy photoUrls-only docs. */
export function portfolioFromPhotoUrls(urls: string[] | undefined): VendorPortfolioItem[] {
  if (!Array.isArray(urls)) return []
  const now = Date.now()
  return urls
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    .slice(0, VENDOR_PORTFOLIO_MAX_IMAGES)
    .map((url, i) => ({
      id: `legacy_${i}_${url.slice(-24)}`,
      url: url.trim(),
      createdAt: now - (urls.length - i),
    }))
}

export function normalizePortfolioItems(
  items: unknown,
  fallbackUrls?: string[]
): VendorPortfolioItem[] {
  if (!Array.isArray(items) || items.length === 0) {
    return portfolioFromPhotoUrls(fallbackUrls)
  }

  const out: VendorPortfolioItem[] = []
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as Record<string, unknown>
    const url = typeof row.url === "string" ? row.url.trim() : ""
    if (!url) continue
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim()
        : newPortfolioId()
    const item: VendorPortfolioItem = {
      id,
      url,
      createdAt:
        typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
          ? row.createdAt
          : Date.now(),
    }
    if (typeof row.caption === "string" && row.caption.trim()) {
      item.caption = row.caption.trim().slice(0, VENDOR_PORTFOLIO_CAPTION_MAX)
    }
    if (isVendorPortfolioEventId(row.eventId)) {
      item.eventId = row.eventId
    }
    out.push(item)
    if (out.length >= VENDOR_PORTFOLIO_MAX_IMAGES) break
  }
  return out
}

export function photoUrlsFromPortfolio(items: VendorPortfolioItem[]): string[] {
  return items.map((i) => i.url)
}

export type PortfolioValidationError = { message: string }

export function validatePortfolioItems(
  items: unknown
): { ok: true; items: VendorPortfolioItem[] } | { ok: false; message: string } {
  if (!Array.isArray(items)) {
    return { ok: false, message: "Portfolio must be a list of photos" }
  }
  if (items.length > VENDOR_PORTFOLIO_MAX_IMAGES) {
    return {
      ok: false,
      message: `You can have at most ${VENDOR_PORTFOLIO_MAX_IMAGES} past-work photos`,
    }
  }

  const normalized: VendorPortfolioItem[] = []
  const seen = new Set<string>()

  for (const raw of items) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, message: "Invalid portfolio item" }
    }
    const row = raw as Record<string, unknown>
    const url = typeof row.url === "string" ? row.url.trim() : ""
    if (!url || url.length > 2048) {
      return { ok: false, message: "Each photo needs a valid image URL" }
    }
    if (!/^https:\/\//i.test(url)) {
      return { ok: false, message: "Photo URLs must be HTTPS" }
    }
    const id =
      typeof row.id === "string" && row.id.trim()
        ? row.id.trim().slice(0, 128)
        : newPortfolioId()
    if (seen.has(id)) {
      return { ok: false, message: "Duplicate portfolio item id" }
    }
    seen.add(id)

    let caption: string | undefined
    if (row.caption !== undefined && row.caption !== null) {
      if (typeof row.caption !== "string") {
        return { ok: false, message: "Caption must be text" }
      }
      caption = row.caption.trim().slice(0, VENDOR_PORTFOLIO_CAPTION_MAX)
      if (!caption) caption = undefined
    }

    let eventId: VendorPortfolioEventId | undefined
    if (row.eventId !== undefined && row.eventId !== null && row.eventId !== "") {
      if (!isVendorPortfolioEventId(row.eventId)) {
        return {
          ok: false,
          message: "Event tag must be Mehndi, Baraat, or Walima",
        }
      }
      eventId = row.eventId
    }

    const createdAt =
      typeof row.createdAt === "number" && Number.isFinite(row.createdAt)
        ? row.createdAt
        : Date.now()

    normalized.push({
      id,
      url,
      createdAt,
      ...(caption ? { caption } : {}),
      ...(eventId ? { eventId } : {}),
    })
  }

  return { ok: true, items: normalized }
}

export function createPortfolioItem(url: string): VendorPortfolioItem {
  return {
    id: newPortfolioId(),
    url: url.trim(),
    createdAt: Date.now(),
  }
}
