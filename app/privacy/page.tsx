import Link from "next/link"

export default function PrivacyPage() {
  return (
    <div className="shaadi-saathi min-h-screen bg-ivory px-6 py-16 text-maroon-dark">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="font-display text-xl font-bold text-maroon-dark">
          Shaadi Saathi
        </Link>
        <h1 className="mt-8 font-display text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-4 text-sm text-maroon/70">
          Placeholder privacy page for the course project demo. Full policy will be added before launch.
        </p>
      </div>
    </div>
  )
}
