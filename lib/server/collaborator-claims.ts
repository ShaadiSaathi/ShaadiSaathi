import type { CollaboratorRole, CollaboratorScope } from "@/lib/collaborator-access"
import { getAdminAuth } from "@/lib/server/firebase-admin"

export async function setCollaboratorAuthClaims(
  uid: string,
  input: {
    weddingCollaboratorRole: CollaboratorRole | "none"
    weddingCollaboratorScopes?: CollaboratorScope[]
  }
): Promise<void> {
  const auth = getAdminAuth()
  const user = await auth.getUser(uid)
  const existing =
    (user.customClaims as Record<string, unknown> | undefined) ?? {}

  if (input.weddingCollaboratorRole === "none") {
    const next = { ...existing }
    delete next.weddingCollaboratorRole
    delete next.weddingCollaboratorScopes
    await auth.setCustomUserClaims(uid, next)
    return
  }

  await auth.setCustomUserClaims(uid, {
    ...existing,
    weddingCollaboratorRole: input.weddingCollaboratorRole,
    ...(input.weddingCollaboratorRole === "limited"
      ? { weddingCollaboratorScopes: input.weddingCollaboratorScopes ?? [] }
      : { weddingCollaboratorScopes: [] }),
  })
}

export async function revokeCollaboratorSessions(uid: string): Promise<void> {
  await getAdminAuth().revokeRefreshTokens(uid)
}
