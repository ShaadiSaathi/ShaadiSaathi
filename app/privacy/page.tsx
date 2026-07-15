import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import Navbar from "@/components/shaadi-saathi/Navbar"
import Footer from "@/components/shaadi-saathi/Footer"

export const metadata: Metadata = {
  title: "Privacy Policy — Shaadi Saathi",
  description:
    "How Shaadi Saathi collects, uses, stores, and protects your data — in plain language.",
}

const LAST_UPDATED = "July 2026"
const CONTACT_EMAIL = "privacy@shaadisaathi.app"

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="font-display text-xl font-bold text-maroon-dark sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-maroon/80">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="shaadi-saathi min-h-screen bg-ivory text-maroon-dark">
      <Navbar />

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-maroon/55">Last updated: {LAST_UPDATED}</p>

        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 p-4 text-[15px] leading-relaxed text-maroon-dark sm:p-5">
          <strong className="font-semibold">A quick note:</strong> This is a general
          privacy policy for our current beta. As we grow, we will update this page
          and notify users of material changes.
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-maroon/80">
          Shaadi Saathi (&ldquo;we&rdquo;, &ldquo;us&rdquo;) helps families and
          vendors plan South Asian weddings. This policy explains what information we
          collect, how we use it, and the choices you have. We&apos;ve tried to keep
          it in plain, readable language.
        </p>

        <Section title="Information we collect">
          <p>We only collect what we need to run the planning tools you use:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-medium text-maroon-dark">Account details</strong> —
              your name and phone number, which we use to create your account and verify
              it by SMS.
            </li>
            <li>
              <strong className="font-medium text-maroon-dark">Wedding details</strong> —
              information you enter such as your wedding name, event dates, and schedules.
            </li>
            <li>
              <strong className="font-medium text-maroon-dark">Guest information</strong> —
              the names, contact details, and RSVP responses you add for your guests.
            </li>
            <li>
              <strong className="font-medium text-maroon-dark">Vendor information</strong> —
              for vendors, your business name, category, city, listing details, bookings,
              and messages with families.
            </li>
            <li>
              <strong className="font-medium text-maroon-dark">Basic technical data</strong> —
              standard information (such as log and device data) that our infrastructure
              provider records to keep the service secure and working.
            </li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <p>We use your information only to provide and improve the service, including to:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>create your account and send a one-time SMS code to verify your number;</li>
            <li>save and show your wedding, guests, tasks, and bookings back to you;</li>
            <li>
              share the relevant details with the people you invite to help plan, and with
              vendors or families you choose to connect with for a booking;
            </li>
            <li>keep the service safe, prevent abuse, and fix problems.</li>
          </ul>
          <p className="font-medium text-maroon-dark">
            We do not sell your personal data, and we do not use it for third-party
            advertising.
          </p>
        </Section>

        <Section title="How your information is stored">
          <p>
            Your data is stored using Google&apos;s Firebase platform (Firebase
            Authentication and Cloud Firestore). We rely on standard, industry-recognised
            security practices, and access is scoped so that each account can only reach
            its own wedding&apos;s data. No online service can promise perfect security,
            but we take reasonable steps to protect your information.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>We share your information only in limited ways:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>with collaborators you explicitly invite to your wedding;</li>
            <li>
              with the vendors or families you choose to interact with (for example, to
              request or confirm a booking);
            </li>
            <li>
              with service providers who help us run the app (such as Firebase, which
              hosts our data and sends verification messages);
            </li>
            <li>where we are required to by law.</li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your information for as long as your account is active and as needed to
            provide the service. If you delete your account, we remove your associated data
            within a reasonable period, except where we&apos;re required to retain some of
            it for legal or security reasons.
          </p>
        </Section>

        <Section title="Deleting your data">
          <p>
            You can ask us to delete your account and its data at any time. Just email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-maroon underline hover:text-gold-dark"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            from the phone number or account associated with your data, and we&apos;ll take
            care of it.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Shaadi Saathi is intended for adults planning weddings and is not directed at
            children. Please don&apos;t use the service if you are under 16.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            As the app grows beyond beta, we may update this policy. When we make material
            changes, we&apos;ll update the date above and let users know within the app or
            by message.
          </p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about your privacy? Reach us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-maroon underline hover:text-gold-dark"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-gold/30 px-6 py-2.5 text-sm font-medium text-maroon transition-colors hover:bg-gold/10"
          >
            ← Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
