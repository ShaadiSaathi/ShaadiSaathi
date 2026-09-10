import { getFirebaseAuth, getApiBaseUrl } from "@/src/lib/firebase"

/** Authenticated API call against the Next.js backend (same as web). */
export async function authenticatedFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  if (!user) throw new Error("Sign in to continue")
  const idToken = await user.getIdToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${idToken}`,
    Accept: "application/json",
  }
  if (init?.body) headers["Content-Type"] = "application/json"
  const extra = init?.headers
  if (extra && typeof extra === "object" && !(extra instanceof Headers)) {
    Object.assign(headers, extra as Record<string, string>)
  }
  const url = path.startsWith("http") ? path : `${getApiBaseUrl()}${path}`
  return fetch(url, {
    ...init,
    headers,
  })
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await authenticatedFetch(path, init)
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}
