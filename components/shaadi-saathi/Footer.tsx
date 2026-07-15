import Link from "next/link"

export default function Footer() {
  return (
    <footer className="border-t border-gold/20 bg-maroon-dark py-10 text-ivory/80">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 sm:flex-row sm:justify-between sm:px-8">
        <div className="text-center sm:text-left">
          <p className="font-display text-xl font-bold text-ivory">Shaadi Saathi</p>
          <p className="mt-1 text-sm text-ivory/60">
            Every event. Every guest. One place.
          </p>
        </div>

        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <li>
              <Link href="/about" className="transition-colors hover:text-gold max-sm:inline-flex max-sm:min-h-[44px] max-sm:items-center">
                About
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="transition-colors hover:text-gold max-sm:inline-flex max-sm:min-h-[44px] max-sm:items-center">
                Privacy
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@shaadisaathi.app"
                className="transition-colors hover:text-gold max-sm:inline-flex max-sm:min-h-[44px] max-sm:items-center"
              >
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <p className="mt-8 text-center text-xs text-ivory/40">
        © {new Date().getFullYear()} Shaadi Saathi. Made with love for desi families.
      </p>
    </footer>
  )
}
