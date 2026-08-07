"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import FeaturedBadge from "@/components/shaadi-saathi/premium/FeaturedBadge"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { NewVendorBadge } from "@/components/shaadi-saathi/shared/StatusBadge"
import { useVendorPortal } from "@/components/shaadi-saathi/vendor-portal/VendorPortalContext"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { isNewVendor } from "@/lib/mockVendorPortal"
import { VENDOR_CATEGORIES } from "@/lib/mockVendors"
import {
  getVendorPayoutAccount,
  isValidPakistaniIban,
  normalizePakistaniIban,
  saveVendorPayoutAccount,
  type VendorPayoutAccount,
} from "@/lib/firebase/vendor-payout-account"
import { getFirestoreDb, isFirebaseConfigured } from "@/lib/firebase/config"
import { getUserProfile } from "@/lib/firebase/users"
import { updateVendorContactEmail } from "@/lib/firebase/vendors"
import { normalizeEmail } from "@/lib/email/config"

const MOCK_GALLERY = [
  { id: "g1", label: "Walima spread" },
  { id: "g2", label: "Live BBQ counter" },
  { id: "g3", label: "Mehndi high tea" },
  { id: "g4", label: "Dessert station" },
]

/** Vendor profile — business info, reliability, verification, payout bank details */
export default function VendorProfile() {
  const { business, updateBusiness, updateIncidentResponse, submitVerification } =
    useVendorPortal()
  const { vendorId, firebaseUser, isFirebaseMode } = useAuth()
  const { vendorTier, vendorCategories, setVendorCategories } = usePremium()
  const isFeatured = vendorTier === "featured"
  const [bio, setBio] = useState(business.bio)
  const [priceRange, setPriceRange] = useState(business.priceRange)
  const [saved, setSaved] = useState(false)
  const [cnic, setCnic] = useState(business.verificationCnic ?? "")
  const [verifyBusinessName, setVerifyBusinessName] = useState(
    business.verificationBusinessName ?? business.name
  )
  const [verifyCity, setVerifyCity] = useState(
    business.verificationCity ?? business.city
  )
  const [verifyBusy, setVerifyBusy] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)

  const [iban, setIban] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [payoutAccount, setPayoutAccount] = useState<VendorPayoutAccount | null>(null)
  const [bankBusy, setBankBusy] = useState(false)
  const [bankError, setBankError] = useState<string | null>(null)
  const [bankSuccess, setBankSuccess] = useState<string | null>(null)

  const [contactEmail, setContactEmail] = useState("")
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isFirebaseMode || !firebaseUser) return
    let cancelled = false
    void (async () => {
      try {
        const profile = await getUserProfile(getFirestoreDb(), firebaseUser.uid)
        if (cancelled) return
        const fromUser = profile?.email?.trim() || ""
        const fromBusiness = business.email?.trim() || ""
        setContactEmail(fromUser || fromBusiness)
      } catch {
        // ignore load errors — field stays optional
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isFirebaseMode, firebaseUser, business.email])

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    setEmailSuccess(null)
    if (!isFirebaseMode || !firebaseUser || !vendorId || !isFirebaseConfigured()) {
      setEmailError("Sign in as a vendor to save email.")
      return
    }
    const trimmed = contactEmail.trim()
    const normalized = trimmed ? normalizeEmail(trimmed) : null
    if (trimmed && !normalized) {
      setEmailError("Enter a valid email address, or leave it blank.")
      return
    }
    setEmailBusy(true)
    try {
      await updateVendorContactEmail(vendorId, firebaseUser.uid, normalized)
      updateBusiness({ email: normalized ?? "" })
      setContactEmail(normalized ?? "")
      setEmailSuccess(normalized ? "Email saved." : "Email cleared.")
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not save email.")
    } finally {
      setEmailBusy(false)
    }
  }

  useEffect(() => {
    setCnic(business.verificationCnic ?? "")
    setVerifyBusinessName(business.verificationBusinessName ?? business.name)
    setVerifyCity(business.verificationCity ?? business.city)
  }, [
    business.verificationCnic,
    business.verificationBusinessName,
    business.verificationCity,
    business.name,
    business.city,
  ])

  useEffect(() => {
    if (!isFirebaseMode || !vendorId) return
    let cancelled = false
    void getVendorPayoutAccount(vendorId)
      .then((account) => {
        if (cancelled || !account) return
        setPayoutAccount(account)
        setIban(account.iban)
        setAccountHolderName(account.accountHolderName)
        setBankName(account.bankName)
        setAccountNumber(account.accountNumber ?? "")
      })
      .catch((err) => {
        console.error("load payout account failed", err)
      })
    return () => {
      cancelled = true
    }
  }, [isFirebaseMode, vendorId])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateBusiness({ bio, priceRange })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleVerificationSubmit(e: React.FormEvent) {
    e.preventDefault()
    setVerifyBusy(true)
    setVerifyError(null)
    setVerifySuccess(null)
    try {
      await submitVerification({
        cnic,
        businessName: verifyBusinessName,
        city: verifyCity,
      })
      setVerifySuccess("Submitted for review. We’ll notify you when it’s approved.")
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Could not submit verification")
    } finally {
      setVerifyBusy(false)
    }
  }

  async function handleBankSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isFirebaseMode || !vendorId || !firebaseUser) {
      setBankError("Sign in as a vendor to save bank details")
      return
    }
    setBankBusy(true)
    setBankError(null)
    setBankSuccess(null)
    try {
      const savedAccount = await saveVendorPayoutAccount(vendorId, firebaseUser.uid, {
        iban,
        accountHolderName,
        bankName,
        accountNumber: accountNumber || undefined,
      })
      setPayoutAccount(savedAccount)
      setIban(savedAccount.iban)
      setBankSuccess(
        "Bank details saved securely. Payouts use your IBAN after verification and job release."
      )
    } catch (err) {
      setBankError(err instanceof Error ? err.message : "Could not save bank details")
    } finally {
      setBankBusy(false)
    }
  }

  const status = business.verificationStatus ?? "unverified"
  const ibanPreviewOk = iban.trim().length === 0 || isValidPakistaniIban(iban)

  if (business.suspended) {
    return (
      <PageTransition>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-amber-900">Account temporarily paused</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-amber-800/90">
            Your listing is paused after repeated missed check-ins. To restore your account,
            complete the reliability review and confirm you understand our day-of check-in policy.
          </p>
          <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm text-amber-900/80">
            <li className="flex gap-2">
              <span aria-hidden="true">1.</span>
              Respond to the platform notice sent to {business.email}
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">2.</span>
              Complete 2 successful check-ins on your next bookings
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">3.</span>
              Contact support if you believe this was an error
            </li>
          </ul>
          <button
            type="button"
            onClick={() => updateBusiness({ suspended: false })}
            className="mt-8 inline-flex min-h-[44px] items-center text-sm font-semibold text-amber-900 underline-offset-2 hover:underline"
          >
            Demo: restore account
          </button>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">Profile</h1>
          <p className="mt-1 text-maroon/60">Manage how families see your business</p>
        </div>
        {!isFeatured && (
          <Link href="/vendor/upgrade">
            <GoldButton variant="ghost">Upgrade to Featured</GoldButton>
          </Link>
        )}
      </header>

      <section
        aria-labelledby="vendor-email-heading"
        className="mb-6 rounded-2xl border border-gold/25 bg-white p-5 sm:p-6"
      >
        <h2
          id="vendor-email-heading"
          className="font-display text-lg font-semibold text-maroon-dark"
        >
          Contact email
          <span className="ml-2 text-sm font-normal text-maroon/40">(optional)</span>
        </h2>
        <p className="mt-1 text-sm text-maroon/60">
          Used for dispute outcome notices. Phone remains your login.
        </p>
        <form onSubmit={handleEmailSave} className="mt-4 space-y-3">
          <label htmlFor="vendor-contact-email" className="text-xs font-medium uppercase tracking-wider text-maroon/50">
            Email
          </label>
          <input
            id="vendor-contact-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@business.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-gold/20 bg-ivory px-4 py-2.5 text-sm text-maroon-dark"
          />
          <div className="flex flex-wrap items-center gap-3">
            <GoldButton type="submit" disabled={emailBusy || !isFirebaseMode}>
              {emailBusy ? "Saving…" : "Save email"}
            </GoldButton>
            {emailSuccess ? <p className="text-sm text-emerald-800">{emailSuccess}</p> : null}
            {emailError ? <p className="text-sm text-rose-700">{emailError}</p> : null}
          </div>
        </form>
      </section>

      <section
        aria-labelledby="verification-heading"
        className="mb-6 rounded-2xl border border-gold/25 bg-white p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="verification-heading"
              className="font-display text-lg font-semibold text-maroon-dark"
            >
              Payment verification
            </h2>
            <p className="mt-1 text-sm text-maroon/60">
              Required before deposits or payouts can be released to you. You can still
              receive booking requests while unverified.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
              status === "verified"
                ? "bg-emerald-50 text-emerald-800"
                : status === "pending"
                  ? "bg-amber-50 text-amber-900"
                  : status === "rejected"
                    ? "bg-rose-50 text-rose-800"
                    : "bg-maroon/8 text-maroon/70"
            }`}
          >
            {status}
          </span>
        </div>

        {status === "verified" ? (
          <p className="mt-4 text-sm text-emerald-800">
            You’re verified. Families can release deposits and payouts to your account.
          </p>
        ) : null}

        {status === "pending" ? (
          <p className="mt-4 text-sm text-amber-900/90">
            Your details are under review. You can’t receive real payments until an admin
            approves verification.
            {business.verificationSubmittedAt
              ? ` Submitted ${new Date(business.verificationSubmittedAt).toLocaleString()}.`
              : null}
          </p>
        ) : null}

        {status === "rejected" ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">Verification not approved</p>
            <p className="mt-1 leading-relaxed">
              {business.verificationRejectionReason ||
                "Please check your CNIC / ID number and business details, then resubmit."}
            </p>
          </div>
        ) : null}

        {status === "unverified" || status === "rejected" ? (
          <form onSubmit={handleVerificationSubmit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="verify-cnic" className="shaadi-label mb-1.5 block">
                CNIC / ID number
              </label>
              <input
                id="verify-cnic"
                className="shaadi-input"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="e.g. 35202-1234567-1"
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="verify-business" className="shaadi-label mb-1.5 block">
                  Business name
                </label>
                <input
                  id="verify-business"
                  className="shaadi-input"
                  value={verifyBusinessName}
                  onChange={(e) => setVerifyBusinessName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="verify-city" className="shaadi-label mb-1.5 block">
                  City
                </label>
                <input
                  id="verify-city"
                  className="shaadi-input"
                  value={verifyCity}
                  onChange={(e) => setVerifyCity(e.target.value)}
                  required
                />
              </div>
            </div>
            {verifyError ? (
              <p className="text-sm text-rose-700" role="alert">
                {verifyError}
              </p>
            ) : null}
            {verifySuccess ? (
              <p className="text-sm text-emerald-700" role="status">
                {verifySuccess}
              </p>
            ) : null}
            <GoldButton type="submit" disabled={verifyBusy}>
              {verifyBusy
                ? "Submitting…"
                : status === "rejected"
                  ? "Resubmit for review"
                  : "Submit for verification"}
            </GoldButton>
          </form>
        ) : null}
      </section>

      {isFirebaseMode ? (
        <section
          aria-labelledby="payout-bank-heading"
          className="mb-6 rounded-2xl border border-gold/25 bg-white p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="payout-bank-heading"
                className="font-display text-lg font-semibold text-maroon-dark"
              >
                Payout bank details
              </h2>
              <p className="mt-1 text-sm text-maroon/60">
                Safepay pays out to a Pakistani IBAN after day-of check-in. These details are
                private — only you and platform admins can see them.
              </p>
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${
                payoutAccount
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-maroon/8 text-maroon/70"
              }`}
            >
              {payoutAccount ? "Saved" : "Not set"}
            </span>
          </div>

          <form onSubmit={handleBankSave} className="mt-5 space-y-4">
            <div>
              <label htmlFor="payout-holder" className="shaadi-label mb-1.5 block">
                Account holder name
              </label>
              <input
                id="payout-holder"
                className="shaadi-input"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="payout-bank" className="shaadi-label mb-1.5 block">
                Bank name
              </label>
              <input
                id="payout-bank"
                className="shaadi-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Bank Alfalah"
                required
              />
            </div>
            <div>
              <label htmlFor="payout-iban" className="shaadi-label mb-1.5 block">
                Pakistani IBAN
              </label>
              <input
                id="payout-iban"
                className="shaadi-input font-mono text-sm"
                value={iban}
                onChange={(e) => setIban(normalizePakistaniIban(e.target.value))}
                placeholder="PK25ALFH0216001008658216"
                autoComplete="off"
                spellCheck={false}
                required
              />
              {!ibanPreviewOk ? (
                <p className="mt-1 text-xs text-rose-700">
                  IBAN must be 24 characters starting with PK.
                </p>
              ) : (
                <p className="mt-1 text-xs text-maroon/45">
                  Required by Safepay — account number alone is not enough for payouts.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="payout-account-number" className="shaadi-label mb-1.5 block">
                Account number <span className="font-normal text-maroon/40">(optional)</span>
              </label>
              <input
                id="payout-account-number"
                className="shaadi-input"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                autoComplete="off"
              />
            </div>
            {bankError ? (
              <p className="text-sm text-rose-700" role="alert">
                {bankError}
              </p>
            ) : null}
            {bankSuccess ? (
              <p className="text-sm text-emerald-700" role="status">
                {bankSuccess}
              </p>
            ) : null}
            <GoldButton type="submit" disabled={bankBusy || !ibanPreviewOk}>
              {bankBusy ? "Saving…" : payoutAccount ? "Update bank details" : "Save bank details"}
            </GoldButton>
          </form>
        </section>
      ) : null}

      <div className="mb-6 rounded-2xl border border-gold/25 bg-white p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon to-maroon-dark font-display text-2xl font-bold text-gold">
            LF
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold text-maroon-dark">{business.name}</h2>
            <p className="text-sm text-maroon/60">
              {business.categoryLabel} · {business.city}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {isFeatured && <FeaturedBadge />}
              {isNewVendor(business.completedJobsCount) ? (
                <NewVendorBadge />
              ) : (
                <>
                  <span className="text-gold-dark" aria-label={`Rating ${business.rating} out of 5`}>
                    {"★".repeat(Math.floor(business.rating))}
                    <span className="text-maroon/30">{"★".repeat(5 - Math.floor(business.rating))}</span>
                  </span>
                  <span className="text-sm font-semibold text-maroon-dark">{business.rating}</span>
                  <span className="text-sm text-maroon/50">({business.reviewCount} reviews)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {isFeatured && (
          <div id="featured-settings" className="mt-5 scroll-mt-6 rounded-xl border border-gold/20 bg-gold/5 p-4">
            <h3 className="text-sm font-semibold text-maroon-dark">Listed categories (up to 3)</h3>
            <p className="mt-1 text-xs text-maroon/50">Featured vendors can appear in multiple categories.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {VENDOR_CATEGORIES.slice(0, 8).map((cat) => {
                const selected = vendorCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        if (vendorCategories.length <= 1) return
                        setVendorCategories(vendorCategories.filter((c) => c !== cat.id))
                      } else if (vendorCategories.length < 3) {
                        setVendorCategories([...vendorCategories, cat.id])
                      }
                    }}
                    className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-maroon text-ivory"
                        : "border border-gold/25 bg-white text-maroon/60 hover:border-gold/40"
                    }`}
                  >
                    {cat.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-5 rounded-xl bg-ivory p-4">
          {isNewVendor(business.completedJobsCount) ? (
            <>
              <p className="text-sm font-semibold text-maroon-dark">Building your track record</p>
              <p className="mt-1 text-xs text-maroon/60">
                Complete {5 - business.completedJobsCount} more jobs to earn a reliability score.
                Families see a neutral &ldquo;New to Shaadi Saathi&rdquo; badge until then.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-maroon-dark">
                Reliability score: {business.reliabilityScore}%
              </p>
              <p className="mt-1 text-xs text-maroon/60">
                {business.onTimeCheckInRate}% on-time check-in rate · Based on confirmed arrivals
                vs missed grace periods over your last 12 months.
              </p>
            </>
          )}
          {business.noShowCount === 1 && (
            <p className="mt-2 text-xs text-maroon/50">
              1 missed check-in on record
            </p>
          )}
          {business.noShowCount >= 2 && (
            <p className="mt-2 text-xs text-maroon/50">
              {business.noShowCount} missed check-ins on record
            </p>
          )}
        </div>

        {business.flaggedIncidents.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-maroon/40">
              Flagged incidents (private)
            </p>
            {business.flaggedIncidents.map((inc) => (
              <div key={inc.id} className="rounded-xl border border-gold/20 bg-ivory p-3 text-sm">
                <p className="text-maroon-dark">{inc.description}</p>
                <p className="mt-1 text-xs text-maroon/50">{inc.date}</p>
                <label className="mt-2 block text-xs text-maroon/60">
                  Your context (not shown publicly)
                  <textarea
                    rows={2}
                    defaultValue={inc.vendorResponse}
                    onBlur={(e) => updateIncidentResponse(inc.id, e.target.value)}
                    placeholder="e.g. Family rescheduled last minute..."
                    className="mt-1 w-full rounded-lg border border-gold/25 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-maroon-dark">Business details</h3>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="business-name" className="mb-1 block text-sm font-medium text-maroon/70">
                Business name
              </label>
              <input
                id="business-name"
                type="text"
                value={business.name}
                readOnly
                className="w-full rounded-xl border border-gold/20 bg-ivory/50 px-4 py-3 text-maroon-dark"
              />
            </div>
            <div>
              <label htmlFor="price-range" className="mb-1 block text-sm font-medium text-maroon/70">
                Price range
              </label>
              <input
                id="price-range"
                type="text"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              />
            </div>
            <div>
              <label htmlFor="bio" className="mb-1 block text-sm font-medium text-maroon/70">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/20"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <h3 className="font-display text-lg font-semibold text-maroon-dark">Photo gallery</h3>
          <p className="mt-1 text-sm text-maroon/60">Mock upload — photos shown to families browsing vendors</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MOCK_GALLERY.map((photo) => (
              <div
                key={photo.id}
                className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-gold/30 bg-ivory text-center text-xs text-maroon/50"
              >
                <svg className="mb-1 h-6 w-6 text-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                </svg>
                {photo.label}
              </div>
            ))}
            <button
              type="button"
              className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-gold/40 bg-gold/5 text-xs font-medium text-maroon/60 hover:bg-gold/10"
            >
              + Add photo
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gold/25 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-semibold text-maroon-dark">
                Available on short notice
              </h3>
              <p className="mt-1 text-sm text-maroon/60">
                Show up in Emergency Backup Vendors when families need a last-minute replacement
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={business.emergencyAvailable}
              onClick={() => updateBusiness({ emergencyAvailable: !business.emergencyAvailable })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                business.emergencyAvailable ? "bg-maroon" : "bg-maroon/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  business.emergencyAvailable ? "left-[22px]" : "left-0.5"
                }`}
              />
              <span className="sr-only">Available on short notice</span>
            </button>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <GoldButton type="submit">Save changes</GoldButton>
          {saved && (
            <span className="text-sm font-medium text-emerald-700" role="status">
              Saved!
            </span>
          )}
        </div>

        <section className="rounded-2xl border border-dashed border-maroon/20 bg-maroon/3 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-maroon/40">Demo only</p>
          <p className="mt-1 text-sm text-maroon/60">
            Toggle suspended state to preview what vendors see after repeated no-shows.
          </p>
          <button
            type="button"
            onClick={() =>
              updateBusiness({
                suspended: true,
                noShowCount: 2,
                flaggedIncidents: [
                  {
                    id: "inc-1",
                    date: "2026-06-15",
                    description: "Missed check-in grace window — Mehndi event",
                  },
                  {
                    id: "inc-2",
                    date: "2026-05-20",
                    description: "Missed check-in grace window — Walima event",
                  },
                ],
              })
            }
            className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-maroon/70 hover:text-maroon"
          >
            Preview suspended account →
          </button>
        </section>
      </form>
    </PageTransition>
  )
}
