/**
 * Shared browser fetch for authenticated API routes.
 * Attaches Firebase ID token + App Check token when available.
 */

"use client"

import { getFirebaseAuth } from "@/lib/firebase/config"
import { withAppCheckHeaders } from "@/lib/firebase/app-check"

export async function authenticatedFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const user = getFirebaseAuth().currentUser
  if (!user) {
    throw new Error("Sign in to continue")
  }
  const idToken = await user.getIdToken()
  const headers = await withAppCheckHeaders({
    ...(init?.headers ?? {}),
    Authorization: `Bearer ${idToken}`,
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
  })
  return fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  })
}
