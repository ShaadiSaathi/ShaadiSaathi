export const runtime = "nodejs"

function describeDsn(raw: string | undefined) {
  const present = typeof raw === "string" && raw.length > 0
  const trimmed = present ? raw.trim() : ""
  const hadWhitespacePadding =
    present && (raw!.length !== trimmed.length || /\s/.test(raw!))
  const hadWrappingQuotes =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  const normalized = hadWrappingQuotes ? trimmed.slice(1, -1).trim() : trimmed

  let protocol: string | null = null
  let host: string | null = null
  let parseOk = false

  try {
    if (normalized) {
      const url = new URL(normalized)
      protocol = url.protocol.replace(/:$/, "")
      host = url.host
      parseOk = true
    }
  } catch {
    parseOk = false
  }

  return {
    present,
    length: present ? raw!.length : 0,
    trimmedLength: normalized.length,
    hadWhitespacePadding,
    hadWrappingQuotes,
    parseOk,
    protocol,
    host,
    looksLikeDeIngest: Boolean(host?.includes("ingest.de.sentry.io")),
    startsWithHttps: normalized.startsWith("https://"),
  }
}

export async function POST() {
  const dsnInfo = describeDsn(process.env.NEXT_PUBLIC_SENTRY_DSN)

  // Temporary diagnostics: never log the full DSN or secrets.
  console.info("[sentry-test] DSN runtime check", {
    envKey: "NEXT_PUBLIC_SENTRY_DSN",
    ...dsnInfo,
  })

  if (!dsnInfo.present || !dsnInfo.parseOk || !dsnInfo.startsWithHttps) {
    return Response.json(
      {
        error: "Sentry is not configured.",
        dsnCheck: dsnInfo,
      },
      { status: 503 }
    )
  }

  throw new Error("Shaadi Saathi Sentry server test error")
}
