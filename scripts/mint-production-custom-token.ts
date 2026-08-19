/**
 * Mint Firebase custom token via IAM signJwt (user OAuth) for smoke tests.
 */
import { readFileSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { OAuth2Client } from "google-auth-library"

const PROJECT_ID = "shaadi-saathi-dd3da"
const UID = process.argv[2] ?? "RLEY5BfOKkb9CWU1R6CNUL1Nfro1"
const FIREBASE_CLI_CLIENT_ID =
  "563584335869-fgrhgmd47bqnekij5iubb5a4evg12e.apps.googleusercontent.com"

async function getAccessToken(): Promise<string> {
  const config = JSON.parse(
    readFileSync(join(homedir(), ".config/configstore/firebase-tools.json"), "utf8")
  ) as { tokens?: { access_token?: string; refresh_token?: string; expires_at?: number } }
  const t = config.tokens
  if (t?.access_token && t.expires_at && t.expires_at > Date.now() + 60_000) {
    return t.access_token
  }
  const oauth2 = new OAuth2Client(FIREBASE_CLI_CLIENT_ID)
  oauth2.setCredentials({ refresh_token: t?.refresh_token })
  const res = await oauth2.getAccessToken()
  const token = typeof res === "string" ? res : res?.token
  if (!token) throw new Error("No access token")
  return token
}

async function findAdminServiceAccount(accessToken: string): Promise<string> {
  const url = `https://iam.googleapis.com/v1/projects/${PROJECT_ID}/serviceAccounts`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`List SAs failed: ${res.status}`)
  const body = (await res.json()) as { accounts?: Array<{ email?: string }> }
  const email = body.accounts?.find((a) =>
    a.email?.includes("firebase-adminsdk")
  )?.email
  if (!email) throw new Error("No firebase-adminsdk service account found")
  return email
}

async function signCustomToken(accessToken: string, saEmail: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: saEmail,
    sub: saEmail,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now,
    exp: now + 3600,
    uid: UID,
  }
  const url = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(saEmail)}:signJwt`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payload: JSON.stringify(payload) }),
  })
  if (!res.ok) throw new Error(`signJwt failed: ${res.status} ${await res.text()}`)
  const body = (await res.json()) as { signedJwt?: string }
  if (!body.signedJwt) throw new Error("No signedJwt returned")
  return body.signedJwt
}

async function main() {
  const access = await getAccessToken()
  const sa = await findAdminServiceAccount(access)
  const custom = await signCustomToken(access, sa)
  process.stdout.write(custom)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
