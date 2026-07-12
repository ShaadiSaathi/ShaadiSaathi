"use client"

import Link from "next/link"
import { useState } from "react"
import Avatar from "@/components/shaadi-saathi/app/Avatar"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import PremiumBadge from "@/components/shaadi-saathi/premium/PremiumBadge"
import UpgradePromptBanner from "@/components/shaadi-saathi/premium/UpgradePromptBanner"
import InviteThemePreview from "@/components/shaadi-saathi/premium/InviteThemePreview"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { WEDDING } from "@/lib/mockData"
import { INVITE_THEMES } from "@/lib/premium"

const ROLE_LABELS = {
  owner: "Owner",
  planner: "Planner",
  viewer: "Viewer",
} as const

export default function SettingsPage() {
  const [copied, setCopied] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [showCollaboratorLimit, setShowCollaboratorLimit] = useState(false)
  const {
    isFamilyPremium,
    inviteTheme,
    setInviteTheme,
    collaborators,
    addCollaborator,
  } = usePremium()

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(WEDDING.shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  function handleInviteMember() {
    if (!inviteName.trim()) return
    const added = addCollaborator(inviteName)
    if (!added) {
      setShowCollaboratorLimit(true)
      return
    }
    setInviteName("")
    setShowCollaboratorLimit(false)
  }

  return (
    <PageTransition>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">
            Family & Settings
          </h1>
          <p className="mt-1 text-maroon/60">
            Invite family members to help coordinate your wedding.
          </p>
        </div>
        {isFamilyPremium ? (
          <PremiumBadge className="text-xs" />
        ) : (
          <Link href="/upgrade">
            <GoldButton variant="ghost">Upgrade to Premium</GoldButton>
          </Link>
        )}
      </header>

      {showCollaboratorLimit && (
        <div className="mb-6">
          <UpgradePromptBanner
            message="Upgrade to Premium to invite up to 8 family collaborators on your wedding."
            onDismiss={() => setShowCollaboratorLimit(false)}
          />
        </div>
      )}

      {/* Share invite */}
      <section
        aria-labelledby="invite-heading"
        className="mb-8 rounded-2xl border border-gold/25 bg-white p-6 shadow-sm"
      >
        <h2 id="invite-heading" className="font-display text-lg font-semibold text-maroon-dark">
          Invite your family
        </h2>
        <p className="mt-2 text-sm text-maroon/60">
          Share this link or code so siblings, parents, and cousins can join and help plan.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-maroon/50">
              Share code
            </label>
            <p className="mt-1 font-display text-2xl font-bold tracking-widest text-maroon-dark">
              {WEDDING.shareCode}
            </p>
          </div>

          <div>
            <label htmlFor="share-link" className="text-xs font-medium uppercase tracking-wider text-maroon/50">
              Share link
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="share-link"
                type="text"
                readOnly
                value={WEDDING.shareLink}
                className="min-w-0 flex-1 rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm text-maroon/70"
              />
              <GoldButton onClick={copyLink}>
                {copied ? "Copied!" : "Copy"}
              </GoldButton>
            </div>
          </div>
        </div>
      </section>

      {/* Invite theme picker */}
      <section
        id="invite-themes"
        aria-labelledby="theme-heading"
        className="mb-8 rounded-2xl border border-gold/25 bg-white p-6 shadow-sm scroll-mt-6"
      >
        <h2 id="theme-heading" className="font-display text-lg font-semibold text-maroon-dark">
          Guest invite theme
        </h2>
        <p className="mt-2 text-sm text-maroon/60">
          Choose how your public guest invite page looks when shared.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
          {INVITE_THEMES.map((t) => {
            const locked = t.id !== "classic" && !isFamilyPremium
            const selected = inviteTheme === t.id
            return (
              <button
                key={t.id}
                type="button"
                disabled={locked}
                onClick={() => setInviteTheme(t.id)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  selected
                    ? "border-maroon bg-maroon/5 ring-2 ring-maroon/20"
                    : locked
                      ? "cursor-not-allowed border-gold/10 bg-ivory/50 opacity-60"
                      : "border-gold/20 hover:border-gold/40"
                }`}
              >
                <div className={`mb-2 h-8 rounded-lg bg-gradient-to-r ${t.motif}`} aria-hidden="true" />
                <p className="font-medium text-maroon-dark">{t.name}</p>
                <p className="mt-0.5 text-xs text-maroon/50">{t.description}</p>
                {locked && (
                  <p className="mt-2 text-xs font-medium text-gold-dark">Premium only</p>
                )}
              </button>
            )
          })}
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-maroon/50">
              Live preview
            </p>
            <InviteThemePreview themeId={inviteTheme} />
            <p className="mt-2 text-xs text-maroon/40">
              This is how guests will see your invite page.
            </p>
          </div>
        </div>

        {!isFamilyPremium && (
          <Link href="/upgrade" className="mt-4 inline-block text-sm font-semibold text-gold-dark hover:underline">
            Unlock custom themes with Premium →
          </Link>
        )}
      </section>

      {/* Family members list */}
      <section aria-labelledby="family-heading">
        <h2 id="family-heading" className="mb-4 font-display text-lg font-semibold text-maroon-dark">
          Who&apos;s helping
          <span className="ml-2 text-sm font-normal text-maroon/40">
            ({collaborators.length}/{isFamilyPremium ? 8 : 2})
          </span>
        </h2>

        <ul className="space-y-2">
          {collaborators.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-gold/15 bg-white px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Avatar initials={member.initials} size="md" />
                <div>
                  <p className="font-medium text-maroon-dark">{member.name}</p>
                  <p className="text-xs text-maroon/50">{ROLE_LABELS[member.role]}</p>
                </div>
              </div>
              {member.role === "owner" && (
                <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold-dark">
                  You
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="collab-name" className="text-xs font-medium text-maroon/50">
              Name
            </label>
            <input
              id="collab-name"
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Fatima Ahmed"
              className="mt-1 w-full rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm"
            />
          </div>
          <GoldButton type="button" onClick={handleInviteMember}>
            + Invite family member
          </GoldButton>
        </div>
      </section>

      {isFamilyPremium && (
        <section className="mt-8">
          <Link
            href="/seating"
            className="flex items-center justify-between rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 to-ivory p-5 transition-shadow hover:shadow-md"
          >
            <div>
              <p className="font-display font-semibold text-maroon-dark">Seating planner</p>
              <p className="text-sm text-maroon/60">Assign confirmed guests to tables</p>
            </div>
            <span className="text-gold-dark">→</span>
          </Link>
        </section>
      )}
    </PageTransition>
  )
}
