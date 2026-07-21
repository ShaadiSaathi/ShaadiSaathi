export const runtime = "nodejs"

export async function POST() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return Response.json(
      { error: "Sentry is not configured." },
      { status: 503 }
    )
  }

  throw new Error("Shaadi Saathi Sentry server test error")
}
