import { readFileSync } from "fs"
import {
  assertWeddingPaymentOwner,
  PaymentAuthError,
} from "../lib/server/payment-auth"

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (!m) continue
  const k = m[1].trim()
  let v = m[2].trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (!process.env[k]) process.env[k] = v
}

async function check(uid: string) {
  try {
    await assertWeddingPaymentOwner("staging-perm-wedding", uid)
    return { ok: true as const }
  } catch (e) {
    if (e instanceof PaymentAuthError) {
      return { ok: false as const, status: e.status, message: e.message }
    }
    throw e
  }
}

async function main() {
  const collab = await check("perm-collab-staging")
  const owner = await check("perm-owner-staging")
  console.log(JSON.stringify({ collab, owner }, null, 2))
  const pass = !collab.ok && collab.status === 403 && owner.ok
  console.log(pass ? "PASS assertWeddingPaymentOwner" : "FAIL assertWeddingPaymentOwner")
  process.exit(pass ? 0 : 1)
}

void main()
