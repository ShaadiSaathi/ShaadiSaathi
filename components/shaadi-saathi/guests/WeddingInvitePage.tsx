"use client"

import { motion } from "framer-motion"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import JaaliDivider from "@/components/shaadi-saathi/JaaliDivider"
import {
  EVENTS,
  WEDDING,
  WEDDING_PUBLIC_INVITE_TOKEN,
  formatEventDate,
} from "@/lib/mockData"

interface WeddingInvitePageProps {
  token: string
}

export default function WeddingInvitePage({ token }: WeddingInvitePageProps) {
  if (token !== WEDDING_PUBLIC_INVITE_TOKEN) {
    return (
      <div className="shaadi-saathi flex min-h-screen items-center justify-center bg-ivory px-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-maroon-dark">Invitation not found</h1>
          <p className="mt-2 text-maroon/60">This wedding invite link is invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="shaadi-saathi relative min-h-screen overflow-hidden bg-ivory text-maroon-dark">
      <MehndiPattern opacity={0.08} />

      <div className="relative border-b border-gold/30 bg-gradient-to-b from-gold/10 to-transparent px-4 py-10 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold-dark">
          Save the date
        </p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 font-display text-3xl font-bold text-maroon-dark sm:text-5xl"
        >
          {WEDDING.couple}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-3 font-display text-lg text-maroon/70"
        >
          {WEDDING.name}
        </motion.p>
      </div>

      <main className="relative mx-auto max-w-lg px-4 py-8">
        <div className="mb-8">
          <JaaliDivider />
        </div>
        <p className="mb-6 text-center text-sm text-maroon/60">
          Join us for our wedding celebrations across three beautiful events.
          Individual RSVP links are sent to each guest separately.
        </p>

        <div className="space-y-5">
          {EVENTS.map((event, i) => (
            <motion.article
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm"
            >
              <div className={`px-5 py-3 ${event.color}`}>
                <h2 className="font-display text-xl font-semibold text-maroon-dark">
                  {event.name}
                </h2>
              </div>
              <div className="space-y-2 px-5 py-4 text-sm text-maroon/70">
                <p className="font-medium text-maroon-dark">
                  {formatEventDate(event.date)} · {event.time}
                </p>
                <p>{event.venue}</p>
                <p className="text-maroon/50">{event.address}</p>
                <p className="pt-1 italic text-maroon/50">{event.description}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <footer className="mt-12 pb-8 text-center">
          <p className="text-xs text-maroon/40">With love, {WEDDING.couple}</p>
        </footer>
      </main>
    </div>
  )
}
