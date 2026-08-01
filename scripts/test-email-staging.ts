/**
 * Staging helper: send one test email via Resend (proves delivery path).
 * Run: npx tsx scripts/test-email-staging.ts you@example.com
 *
 * Requires RESEND_API_KEY in .env.local (and preferably a verified domain
 * in RESEND_FROM_EMAIL for non-account inboxes).
 */
import { readFileSync } from "fs"

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (!m) continue
  const k = m[1]!.trim()
  let v = m[2]!.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  if (!process.env[k]) process.env[k] = v
}

const to = process.argv[2]?.trim()
if (!to) {
  console.error("Usage: npx tsx scripts/test-email-staging.ts you@example.com")
  process.exit(2)
}

async function main() {
  const { isEmailConfigured, sendEmail, getEmailFromAddress } = await import(
    "../lib/email"
  )
  console.log(
    JSON.stringify(
      {
        configured: isEmailConfigured(),
        from: getEmailFromAddress(),
        to,
      },
      null,
      2
    )
  )
  const result = await sendEmail({
    to,
    subject: "Shaadi Saathi staging — test email",
    text: [
      "This is a staging test from Shaadi Saathi.",
      "",
      "If you received this, Resend delivery is working for this recipient.",
      `Sent at: ${new Date().toISOString()}`,
    ].join("\n"),
  })
  console.log(JSON.stringify(result, null, 2))
  if (!result.ok) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
