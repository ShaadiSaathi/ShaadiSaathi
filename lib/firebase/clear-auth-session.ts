"use client"

/**
 * Ensure a fresh phone-auth attempt isn't blocked by an existing Firebase
 * session (e.g. family user starting vendor signup in the same browser).
 */
import { signOut } from "firebase/auth"
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/config"

export async function clearExistingAuthSession(): Promise<void> {
  if (!isFirebaseConfigured()) return
  const auth = getFirebaseAuth()
  if (!auth.currentUser) return
  try {
    await signOut(auth)
  } catch {
    // Best-effort — send path still proceeds.
  }
}
