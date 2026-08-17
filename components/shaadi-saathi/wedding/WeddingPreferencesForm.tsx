"use client"

import { useState } from "react"
import AuthSubmitButton from "@/components/shaadi-saathi/auth/AuthSubmitButton"
import {
  GUEST_COUNT_RANGE_OPTIONS,
  WEDDING_BUDGET_TIER_OPTIONS,
  WEDDING_PLANNING_EVENT_OPTIONS,
  WEDDING_STYLE_OPTIONS,
  WEDDING_TRADITION_REGION_OPTIONS,
  normalizeWeddingPlanningPreferences,
  type GuestCountRange,
  type WeddingBudgetTier,
  type WeddingPlanningEvent,
  type WeddingPlanningPreferences,
  type WeddingPlanningTimeline,
  type WeddingStylePreference,
  type WeddingTraditionRegion,
} from "@/lib/wedding-preferences"

export interface WeddingPreferencesFormProps {
  initial?: WeddingPlanningPreferences | null
  /** Pre-fill timeline date from first event date during onboarding */
  defaultWeddingDate?: string
  onSubmit: (preferences: WeddingPlanningPreferences) => Promise<void>
  onSkip?: () => void
  submitLabel?: string
  skipLabel?: string
  intro?: string
  compact?: boolean
}

const inputClass =
  "w-full rounded-xl border border-gold/25 bg-ivory px-4 py-3 text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"

const chipClass = (selected: boolean) =>
  [
    "rounded-full border px-3 py-1.5 text-sm transition",
    selected
      ? "border-maroon bg-maroon/10 text-maroon-dark"
      : "border-gold/25 bg-ivory text-maroon/70 hover:border-maroon/30",
  ].join(" ")

export default function WeddingPreferencesForm({
  initial,
  defaultWeddingDate,
  onSubmit,
  onSkip,
  submitLabel = "Save preferences",
  skipLabel = "Skip for now, add later",
  intro,
  compact = false,
}: WeddingPreferencesFormProps) {
  const [traditionRegion, setTraditionRegion] = useState<
    WeddingTraditionRegion | ""
  >(initial?.traditionRegion ?? "")
  const [plannedEvents, setPlannedEvents] = useState<WeddingPlanningEvent[]>(
    initial?.plannedEvents ?? []
  )
  const [guestCountRange, setGuestCountRange] = useState<GuestCountRange | "">(
    initial?.guestCountRange ?? ""
  )
  const [stylePreference, setStylePreference] = useState<
    WeddingStylePreference | ""
  >(initial?.stylePreference ?? "")
  const [budgetTier, setBudgetTier] = useState<WeddingBudgetTier | "">(
    initial?.budgetTier ?? ""
  )
  const [timeline, setTimeline] = useState<WeddingPlanningTimeline | "">(
    initial?.timeline ?? (defaultWeddingDate ? "has_date" : "")
  )
  const [targetWeddingDate, setTargetWeddingDate] = useState(
    initial?.targetWeddingDate ?? defaultWeddingDate ?? ""
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleEvent(event: WeddingPlanningEvent) {
    setPlannedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const raw: WeddingPlanningPreferences = {
        ...(traditionRegion ? { traditionRegion } : {}),
        ...(plannedEvents.length ? { plannedEvents } : {}),
        ...(guestCountRange ? { guestCountRange } : {}),
        ...(stylePreference ? { stylePreference } : {}),
        ...(budgetTier ? { budgetTier } : {}),
        ...(timeline ? { timeline } : {}),
        ...(timeline === "has_date" && targetWeddingDate.trim()
          ? { targetWeddingDate: targetWeddingDate.trim() }
          : {}),
      }
      const normalized = normalizeWeddingPlanningPreferences(raw)
      if (!normalized) {
        if (onSkip) {
          onSkip()
          return
        }
        setError("Pick at least one preference, or skip for now.")
        setLoading(false)
        return
      }
      await onSubmit(normalized)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save preferences."
      )
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-5"}>
      {intro ? (
        <p className="text-sm leading-relaxed text-maroon/60">{intro}</p>
      ) : null}

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-maroon/70">
          Wedding tradition / region
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEDDING_TRADITION_REGION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={chipClass(traditionRegion === opt.value)}
              onClick={() =>
                setTraditionRegion((prev) =>
                  prev === opt.value ? "" : opt.value
                )
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-maroon/70">
          Events you&apos;re planning
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEDDING_PLANNING_EVENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={chipClass(plannedEvents.includes(opt.value))}
              onClick={() => toggleEvent(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-maroon/70">
          Approximate guest count
        </legend>
        <div className="flex flex-wrap gap-2">
          {GUEST_COUNT_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={chipClass(guestCountRange === opt.value)}
              onClick={() =>
                setGuestCountRange((prev) =>
                  prev === opt.value ? "" : opt.value
                )
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-maroon/70">
          Style preference
        </legend>
        <div className="flex flex-wrap gap-2">
          {WEDDING_STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={chipClass(stylePreference === opt.value)}
              onClick={() =>
                setStylePreference((prev) => (prev === opt.value ? "" : opt.value))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-maroon/70">
          Budget tier{" "}
          <span className="font-normal text-maroon/45">(optional)</span>
        </legend>
        <p className="mb-2 text-xs text-maroon/45">
          Broad ranges only — we never store exact amounts.
        </p>
        <div className="flex flex-wrap gap-2">
          {WEDDING_BUDGET_TIER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={chipClass(budgetTier === opt.value)}
              onClick={() =>
                setBudgetTier((prev) => (prev === opt.value ? "" : opt.value))
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-maroon/70">
          Timeline
        </legend>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-maroon/80">
            <input
              type="radio"
              name="planning-timeline"
              checked={timeline === "has_date"}
              onChange={() => setTimeline("has_date")}
              className="text-maroon focus:ring-maroon/20"
            />
            We have a wedding date in mind
          </label>
          {timeline === "has_date" ? (
            <input
              type="date"
              value={targetWeddingDate}
              onChange={(e) => setTargetWeddingDate(e.target.value)}
              className={inputClass}
            />
          ) : null}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-maroon/80">
            <input
              type="radio"
              name="planning-timeline"
              checked={timeline === "no_date_yet"}
              onChange={() => {
                setTimeline("no_date_yet")
                setTargetWeddingDate("")
              }}
              className="text-maroon focus:ring-maroon/20"
            />
            Just started planning — no date yet
          </label>
        </div>
      </fieldset>

      {error ? (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AuthSubmitButton loading={loading}>{submitLabel}</AuthSubmitButton>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            disabled={loading}
            className="text-sm font-medium text-maroon/55 underline-offset-2 hover:text-maroon hover:underline disabled:opacity-50"
          >
            {skipLabel}
          </button>
        ) : null}
      </div>
    </form>
  )
}
