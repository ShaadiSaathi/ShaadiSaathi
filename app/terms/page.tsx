import Link from "next/link"

export default function TermsPage() {
  return (
    <div className="shaadi-saathi min-h-screen bg-ivory px-6 py-16 text-maroon-dark">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="font-display text-xl font-bold text-maroon-dark">
          Shaadi Saathi
        </Link>
        <h1 className="mt-8 font-display text-2xl font-bold">Terms of Service</h1>
        <p className="mt-4 text-sm text-maroon/70">
          Placeholder terms page for the course project demo. Full legal copy will be added before launch.
        </p>
      </div>
    </div>
  )
}
