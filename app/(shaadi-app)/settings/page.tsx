"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { isValidPhoneNumber } from "react-phone-number-input"
import Avatar from "@/components/shaadi-saathi/app/Avatar"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import PhoneInput from "@/components/shaadi-saathi/auth/PhoneInput"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { useWeddingMembers } from "@/components/shaadi-saathi/family/WeddingMembersContext"
import PremiumBadge from "@/components/shaadi-saathi/premium/PremiumBadge"
import UpgradePromptBanner from "@/components/shaadi-saathi/premium/UpgradePromptBanner"
import InviteThemePreview from "@/components/shaadi-saathi/premium/InviteThemePreview"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { createWeddingInviteUrl } from "@/lib/mockData"
import { INVITE_THEMES } from "@/lib/premium"
import { useWedding } from "@/components/shaadi-saathi/firebase/WeddingContext"
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/config"
import { getUserProfile, updateUserContactEmail } from "@/lib/firebase/users"
import { normalizeEmail } from "@/lib/email/config"
import WeddingPreferencesSettings from "@/components/shaadi-saathi/wedding/WeddingPreferencesSettings"

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone
  return `${phone.slice(0, 4)}••••${phone.slice(-2)}`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function ContactEmailForm() {
  const { firebaseUser, isFirebaseMode } = useAuth()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseMode || !firebaseUser || !isFirebaseConfigured()) {
      setLoading(false)
      return
    }
    let cancelled = false
    void getUserProfile(getFirestoreDb(), firebaseUser.uid)
      .then((profile) => {
        if (cancelled) return
        setEmail(profile?.email ?? "")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [firebaseUser, isFirebaseMode])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!firebaseUser || !isFirebaseMode) {
      setError("Sign in to save an email.")
      return
    }
    const trimmed = email.trim()
    const normalized = trimmed ? normalizeEmail(trimmed) : null
    if (trimmed && !normalized) {
      setError("Enter a valid email address, or leave it blank.")
      return
    }
    setSaving(true)
    try {
      await updateUserContactEmail(getFirestoreDb(), firebaseUser.uid, normalized)
      setEmail(normalized ?? "")
      setMessage(normalized ? "Email saved." : "Email cleared.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save email.")
    } finally {
      setSaving(false)
    }
  }

  if (!isFirebaseMode) {
    return (
      <p className="mt-3 text-sm text-maroon/50">
        Email contact is available when signed in with Firebase.
      </p>
    )
  }

  if (loading) {
    return <p className="mt-3 text-sm text-maroon/50">Loading…</p>
  }

  return (
    <form onSubmit={handleSave} className="mt-4 space-y-3">
      <label htmlFor="contact-email" className="shaadi-label uppercase tracking-wider">
        Email
      </label>
      <input
        id="contact-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-h-[44px] w-full rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm text-maroon-dark"
      />
      <div className="flex flex-wrap items-center gap-3">
        <GoldButton type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save email"}
        </GoldButton>
        {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      </div>
    </form>
  )
}

export default function SettingsPage() {
  const [copied, setCopied] = useState(false)
  const [invitePhone, setInvitePhone] = useState("")
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [showCollaboratorLimit, setShowCollaboratorLimit] = useState(false)
  const { weddingId, isFirebaseMode, firebaseUser } = useAuth()
  const { wedding } = useWedding()
  const {
    isFamilyPremium,
    inviteTheme,
    setInviteTheme,
  } = usePremium()
  const {
    members,
    pendingInvites,
    loading: membersLoading,
    memberLimit,
    canInviteMore,
    isOwner,
    inviteByPhone,
    cancelInvite,
    setMemberPaymentAccess,
  } = useWeddingMembers()
  const [paymentAccessBusyUid, setPaymentAccessBusyUid] = useState<string | null>(null)
  const [paymentAccessError, setPaymentAccessError] = useState<string | null>(null)

  const guestInviteUrl =
    typeof window !== "undefined" && weddingId
      ? createWeddingInviteUrl(window.location.origin, weddingId)
      : ""
  const shareCode = wedding?.shareCode ?? (isFirebaseMode ? "…" : "DEMO-CODE")

  async function copyGuestLink() {
    if (!guestInviteUrl) return
    try {
      await navigator.clipboard.writeText(guestInviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  async function handleInviteMember() {
    setInviteError(null)
    if (!isValidPhoneNumber(invitePhone)) {
      setInviteError("Please enter a valid phone number with country code.")
      return
    }
    if (!canInviteMore) {
      setShowCollaboratorLimit(true)
      return
    }
    setInviteLoading(true)
    try {
      await inviteByPhone(invitePhone)
      setInvitePhone("")
      setShowCollaboratorLimit(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not send invite. Please try again."
      if (/premium|maximum|limit/i.test(message)) {
        setShowCollaboratorLimit(true)
      }
      setInviteError(message)
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <PageTransition>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="shaadi-page-title">
            Family & Settings
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-maroon/60 sm:text-base">
            Invite real family members by phone so they can help plan in the app.
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

      {/* Optional contact email — receipts & updates only; phone remains login */}
      <section
        aria-labelledby="contact-email-heading"
        className="mb-8 shaadi-card p-5 sm:p-6"
      >
        <h2 id="contact-email-heading" className="shaadi-section-title sm:text-xl">
          Contact email
          <span className="ml-2 text-sm font-normal text-maroon/40">(optional)</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-maroon/60">
          Add an email if you want payment receipts and dispute updates. Phone
          number stays your login — this is never required.
        </p>
        <ContactEmailForm />
      </section>

      <section
        aria-labelledby="planning-preferences-heading"
        className="mb-8 shaadi-card p-5 sm:p-6"
      >
        <h2 id="planning-preferences-heading" className="shaadi-section-title sm:text-xl">
          Wedding planning preferences
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-maroon/60">
          Helps Wedding AI tailor answers to your tradition, events, and guest
          scale — without you repeating yourself each time.
        </p>
        <WeddingPreferencesSettings />
      </section>

      {/* Guest RSVP invite — separate from collaborator access */}
      <section
        aria-labelledby="guest-invite-heading"
        className="mb-8 shaadi-card p-5 sm:p-6"
      >
        <h2 id="guest-invite-heading" className="shaadi-section-title sm:text-xl">
          Guest RSVP link
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-maroon/60">
          Share this with guests so they can RSVP — it does not grant app access.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="shaadi-label uppercase tracking-wider">
              Share code
            </label>
            <p className="shaadi-stat-value mt-1 tracking-widest">
              {shareCode}
            </p>
          </div>

          {guestInviteUrl && (
            <div>
              <label htmlFor="guest-share-link" className="text-xs font-medium uppercase tracking-wider text-maroon/50">
                Guest invite link
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="guest-share-link"
                  type="text"
                  readOnly
                  value={guestInviteUrl}
                  className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm text-maroon/70"
                />
                <GoldButton onClick={copyGuestLink}>
                  {copied ? "Copied!" : "Copy"}
                </GoldButton>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Invite theme picker */}
      <section
        id="invite-themes"
        aria-labelledby="theme-heading"
        className="mb-8 shaadi-card p-5 scroll-mt-6 sm:p-6"
      >
        <h2 id="theme-heading" className="shaadi-section-title sm:text-xl">
          Guest invite theme
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-maroon/60">
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
          </div>
        </div>
      </section>

      {/* Real family collaborators */}
      <section aria-labelledby="family-heading">
        <h2 id="family-heading" className="mb-4 shaadi-section-title sm:text-xl">
          Who&apos;s helping
          <span className="ml-2 text-sm font-normal text-maroon/40">
            ({members.length + pendingInvites.length}/{memberLimit})
          </span>
        </h2>

        {membersLoading ? (
          <p className="text-sm text-maroon/50">Loading members…</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const isSelf = firebaseUser?.uid === member.uid
              const showPaymentToggle =
                isOwner && member.role !== "owner" && Boolean(setMemberPaymentAccess)
              return (
              <li
                key={member.uid}
                className="shaadi-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar initials={initials(member.name)} size="md" />
                  <div>
                    <p className="font-medium text-maroon-dark">{member.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          member.role === "owner"
                            ? "bg-maroon/10 text-maroon-dark"
                            : "bg-gold/15 text-gold-dark"
                        }`}
                      >
                        {member.role === "owner" ? "Owner" : "Collaborator"}
                      </span>
                      {member.role !== "owner" && member.canApprovePayments ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Can approve payments
                        </span>
                      ) : null}
                      {member.phone ? (
                        <span className="text-xs text-maroon/50">{maskPhone(member.phone)}</span>
                      ) : null}
                      {isSelf ? (
                        <span className="inline-flex rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-dark">
                          You
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                {showPaymentToggle ? (
                  <label className="flex cursor-pointer items-center gap-2 self-start sm:self-center">
                    <span className="text-xs text-maroon/60">Payment access</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gold/40 text-maroon focus:ring-maroon/30"
                      checked={Boolean(member.canApprovePayments)}
                      disabled={paymentAccessBusyUid === member.uid}
                      onChange={(e) => {
                        const allowed = e.target.checked
                        setPaymentAccessError(null)
                        setPaymentAccessBusyUid(member.uid)
                        void setMemberPaymentAccess(member.uid, allowed)
                          .catch((err: unknown) => {
                            setPaymentAccessError(
                              err instanceof Error
                                ? err.message
                                : "Could not update payment access."
                            )
                          })
                          .finally(() => setPaymentAccessBusyUid(null))
                      }}
                    />
                  </label>
                ) : null}
              </li>
              )
            })}

            {pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="shaadi-card flex items-center justify-between border border-dashed border-gold/25 bg-ivory/40 p-4"
              >
                <div>
                  <p className="font-medium text-maroon-dark">{maskPhone(invite.phone)}</p>
                  <p className="text-xs text-amber-700">Invite pending — waiting for them to sign up</p>
                </div>
                <button
                  type="button"
                  onClick={() => void cancelInvite(invite.id)}
                  className="text-xs font-medium text-maroon/50 hover:text-rose-600"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}

        {paymentAccessError ? (
          <p className="mt-3 text-sm text-rose-700" role="alert">
            {paymentAccessError}
          </p>
        ) : null}
        {isOwner ? (
          <p className="mt-3 text-xs text-maroon/45">
            Collaborators can view payment status for planning. Turn on &quot;Payment access&quot; to
            let a trusted person also approve deposits, balances, and disputes.
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          <p className="text-sm text-maroon/60">
            Enter their phone number. When they sign up or log in with that number, they&apos;ll see
            your invite and can join this wedding.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <PhoneInput
                id="collab-phone"
                value={invitePhone}
                onChange={setInvitePhone}
                error={inviteError ?? undefined}
              />
            </div>
            <GoldButton
              type="button"
              onClick={handleInviteMember}
              disabled={inviteLoading || !isFirebaseMode}
            >
              {inviteLoading ? "Sending…" : "+ Invite by phone"}
            </GoldButton>
          </div>
          {members.length <= 1 && pendingInvites.length === 0 && (
            <p className="text-xs text-maroon/45">
              Invite siblings, parents, or cousins — once they join, you can assign tasks to them.
            </p>
          )}
        </div>
      </section>

      {isFamilyPremium && (
        <section className="mt-8">
          <Link
            href="/seating"
            className="flex items-center justify-between rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 to-ivory p-5 transition-shadow hover:shadow-md"
          >
            <div>
              <p className="font-semibold text-maroon-dark">Seating planner</p>
              <p className="text-sm text-maroon/60">Assign confirmed guests to tables</p>
            </div>
            <span className="text-gold-dark">→</span>
          </Link>
        </section>
      )}
    </PageTransition>
  )
}
