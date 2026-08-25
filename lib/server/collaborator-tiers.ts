import type { CollaboratorAccessEntry } from "@/lib/collaborator-access"
import { getAdminDb } from "@/lib/server/firebase-admin"

/** One wedding per user — tier doc keyed by UID for reliable rules lookups. */
export function collaboratorTierDocId(uid: string): string {
  return uid
}

export async function setCollaboratorTierDoc(
  weddingId: string,
  uid: string,
  entry: CollaboratorAccessEntry
): Promise<void> {
  await getAdminDb()
    .collection("collaborator_tiers")
    .doc(collaboratorTierDocId(uid))
    .set({
      weddingId,
      uid,
      ...entry,
    })
}

export async function deleteCollaboratorTierDoc(
  _weddingId: string,
  uid: string
): Promise<void> {
  await getAdminDb()
    .collection("collaborator_tiers")
    .doc(collaboratorTierDocId(uid))
    .delete()
}
