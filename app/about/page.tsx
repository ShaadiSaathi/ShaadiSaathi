import type { Metadata } from "next"
import Link from "next/link"
import Navbar from "@/components/shaadi-saathi/Navbar"
import Footer from "@/components/shaadi-saathi/Footer"
import JaaliDivider from "@/components/shaadi-saathi/JaaliDivider"

export const metadata: Metadata = {
  title: "About — Shaadi Saathi",
  description:
    "Why we built Shaadi Saathi: one calm, shared home for the beautiful chaos of a multi-event desi wedding.",
}

export default function AboutPage() {
  return (
    <div className="shaadi-saathi min-h-screen bg-ivory text-maroon-dark">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-gold-dark">
          Our story
        </p>
        <h1 className="mt-3 text-center font-display text-3xl font-bold leading-tight sm:text-4xl">
          Every event. Every guest.
          <br className="hidden sm:block" /> One place.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed text-maroon/75 sm:text-lg">
          Shaadi Saathi is a shared planning home for South Asian weddings — built
          for the families juggling a mehndi, a baraat, a walima, and everyone in
          between.
        </p>

        <div className="mt-10">
          <JaaliDivider />
        </div>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            The beautiful chaos we set out to tame
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-maroon/80">
            <p>
              A desi shaadi isn&apos;t one event — it&apos;s a season. There&apos;s
              the dholki, the mayun, the mehndi, the baraat, the walima, and often
              a few smaller gatherings squeezed in between. Each one has its own
              guest list, its own timings, its own vendors, and its own last-minute
              surprises.
            </p>
            <p>
              For most families, all of that ends up scattered across a dozen
              WhatsApp groups, a notes app, a paper list taped to the fridge, and
              three different people&apos;s memories. Someone always gets missed off
              an invite. Nobody&apos;s quite sure who confirmed for the walima. The
              caterer&apos;s final number changes twice in one afternoon.
            </p>
            <p>
              We built Shaadi Saathi because planning a wedding should feel like a
              celebration, not a second job.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            What Shaadi Saathi does
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-maroon/80">
            <p>
              It brings every event, every guest, and every booking into one calm,
              shared space that the whole family can open on their phone. Manage
              your guest lists and RSVPs per event, keep track of tasks and
              deadlines, discover and book trusted vendors, and see the full picture
              of your wedding week at a glance.
            </p>
            <p>
              Invite the people helping you plan — parents, siblings, cousins — so
              everyone&apos;s working from the same, always-up-to-date list instead
              of forwarding screenshots back and forth.
            </p>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-gold/25 bg-white/60 p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold text-maroon-dark sm:text-2xl">
            A note from us
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-maroon/80">
            <p>
              We come from families where weddings are loud, warm, and gloriously
              complicated — where the aunties know everything, the cousins arrive
              late, and somehow it all comes together in the end. Shaadi Saathi is
              our small way of holding some of that chaos gently, so you can spend
              less time chasing details and more time actually enjoying the people
              you&apos;re celebrating with.
            </p>
            <p className="font-medium text-maroon-dark">
              Here&apos;s to your shaadi — every event, every guest, in one place.
            </p>
          </div>
        </section>

        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-gold px-6 py-2.5 text-sm font-semibold text-maroon-dark shadow-sm shadow-gold/20 transition-all hover:scale-[1.03] hover:shadow-md hover:shadow-gold/30 sm:w-auto"
          >
            Start planning free
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-gold/30 px-6 py-2.5 text-sm font-medium text-maroon transition-colors hover:bg-gold/10 sm:w-auto"
          >
            ← Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
