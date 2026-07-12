import {
  doc,
  getDoc,
  setDoc,
  type Firestore,
} from "firebase/firestore"
import type { FirestoreUser, UserRole } from "./types"

export async function getUserProfile(
  db: Firestore,
  uid: string
): Promise<FirestoreUser | null> {
  const snap = await getDoc(doc(db, "users", uid))
  if (!snap.exists()) return null
  return snap.data() as FirestoreUser
}

export async function upsertUserProfile(
  db: Firestore,
  profile: FirestoreUser
): Promise<void> {
  await setDoc(doc(db, "users", profile.uid), profile, { merge: true })
}

export async function createUserProfile(
  db: Firestore,
  input: {
    uid: string
    role: UserRole
    phone: string
    name: string
    weddingId?: string
    vendorId?: string
  }
): Promise<FirestoreUser> {
  const profile: FirestoreUser = {
    ...input,
    createdAt: Date.now(),
  }
  await setDoc(doc(db, "users", input.uid), profile)
  return profile
}
