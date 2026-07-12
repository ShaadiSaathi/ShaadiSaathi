"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { setUserProfile, type UserProfile } from "@/utils/storage"

const ETHNICITIES = [
  "Caucasian",
  "South Asian",
  "East Asian",
  "Southeast Asian",
  "Middle Eastern",
  "African",
  "Latin American",
  "Mixed",
  "Prefer not to say",
]

const GOALS = [
  "Improve facial aesthetics",
  "Track my progress",
  "Understand my features",
  "Get a glow-up plan",
  "Skincare improvement",
  "Hair improvement",
  "Body improvement",
]

const EXPERIENCE = [
  { id: "new", label: "New to this", desc: "Just starting my self-improvement journey" },
  { id: "basics", label: "I know the basics", desc: "Familiar with common concepts and terms" },
  { id: "experienced", label: "Experienced", desc: "Deep knowledge of looksmaxxing strategies" },
]

const TOTAL_STEPS = 8

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  const [gender, setGender] = useState<"male" | "female" | null>(null)
  const [age, setAge] = useState(20)
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm")
  const [heightCm, setHeightCm] = useState(175)
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg")
  const [weightKg, setWeightKg] = useState(75)
  const [ethnicity, setEthnicity] = useState<string | undefined>()
  const [goals, setGoals] = useState<string[]>([])
  const [experience, setExperience] = useState<string | null>(null)

  function canProceed(): boolean {
    switch (step) {
      case 1: return gender !== null
      case 2: return age >= 14 && age <= 65
      case 3: return heightCm >= 120 && heightCm <= 230
      case 4: return weightKg >= 30 && weightKg <= 200
      case 5: return true
      case 6: return goals.length > 0
      case 7: return experience !== null
      case 8: return true
      default: return false
    }
  }

  function next() {
    if (!canProceed()) return
    if (step === 8) {
      const profile: UserProfile = {
        gender: gender!,
        age,
        heightCm,
        weightKg,
        ethnicity,
        goals,
        experience: experience!,
        units: "metric",
        onboardingComplete: true,
        memberSince: new Date().toISOString(),
      }
      setUserProfile(profile)
      router.push("/dashboard")
      return
    }
    setStep((s) => s + 1)
  }

  function back() {
    if (step === 1) return
    setStep((s) => s - 1)
  }

  function toggleGoal(g: string) {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    )
  }

  const ft = Math.floor(heightCm / 30.48)
  const inches = Math.round((heightCm / 2.54) % 12)
  const lbs = Math.round(weightKg * 2.205)

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 max-w-lg mx-auto">
      <div className="mb-8">
        <div className="flex justify-between text-xs text-text-muted mb-2">
          <span>Step {step} of {TOTAL_STEPS}</span>
          <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-tertiary transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div
        key={step}
        className={`flex-1 step-enter`}
      >
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What&apos;s your gender?</h2>
            <p className="text-text-secondary mb-8">Used to calibrate your facial analysis.</p>
            <div className="grid grid-cols-2 gap-4">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`p-6 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                    gender === g
                      ? "border-accent bg-accent/10 glow-accent-sm"
                      : "border-border bg-card hover:border-accent/30"
                  }`}
                >
                  <svg className="w-12 h-12 mx-auto mb-3 text-text-secondary" viewBox="0 0 48 48" fill="currentColor">
                    {g === "male" ? (
                      <path d="M24 4c-5.5 0-10 4.5-10 10 0 4.2 2.6 7.8 6.3 9.3L14 36h6l4-10h4l4 10h6l-6.3-12.7c3.7-1.5 6.3-5.1 6.3-9.3 0-5.5-4.5-10-10-10zm0 4c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6z" />
                    ) : (
                      <path d="M24 4c-5.5 0-10 4.5-10 10 0 4.2 2.6 7.8 6.3 9.3L14 36h6l4-10h4l4 10h6l-6.3-12.7c3.7-1.5 6.3-5.1 6.3-9.3 0-5.5-4.5-10-10-10zm0 4c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6zm-2 28v8h4v-8h-4z" />
                    )}
                  </svg>
                  <span className="font-semibold capitalize">{g}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">How old are you?</h2>
            <p className="text-text-secondary mb-12">Must be between 14 and 65.</p>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setAge((a) => Math.max(14, a - 1))}
                className="w-12 h-12 rounded-xl bg-card border border-border text-2xl hover:border-accent active:scale-95 transition-all"
              >−</button>
              <span className="text-7xl font-bold tabular-nums text-accent">{age}</span>
              <button
                onClick={() => setAge((a) => Math.min(65, a + 1))}
                className="w-12 h-12 rounded-xl bg-card border border-border text-2xl hover:border-accent active:scale-95 transition-all"
              >+</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What&apos;s your height?</h2>
            <div className="flex rounded-full bg-card border border-border p-1 mb-8 w-fit">
              {(["cm", "ft"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setHeightUnit(u)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    heightUnit === u ? "bg-accent text-white" : "text-text-secondary"
                  }`}
                >{u === "cm" ? "cm" : "ft/in"}</button>
              ))}
            </div>
            <div className="text-center mb-6">
              <span className="text-5xl font-bold tabular-nums text-accent">
                {heightUnit === "cm" ? `${heightCm}` : `${ft}'${inches}"`}
              </span>
              {heightUnit === "cm" && <span className="text-text-secondary ml-2">cm</span>}
            </div>
            <input
              type="range"
              min={120}
              max={230}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What&apos;s your weight?</h2>
            <div className="flex rounded-full bg-card border border-border p-1 mb-8 w-fit">
              {(["kg", "lbs"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setWeightUnit(u)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    weightUnit === u ? "bg-accent text-white" : "text-text-secondary"
                  }`}
                >{u}</button>
              ))}
            </div>
            <div className="text-center mb-6">
              <span className="text-5xl font-bold tabular-nums text-accent">
                {weightUnit === "kg" ? weightKg : lbs}
              </span>
              <span className="text-text-secondary ml-2">{weightUnit}</span>
            </div>
            <input
              type="range"
              min={weightUnit === "kg" ? 30 : 66}
              max={weightUnit === "kg" ? 200 : 440}
              value={weightUnit === "kg" ? weightKg : lbs}
              onChange={(e) => {
                const v = Number(e.target.value)
                setWeightKg(weightUnit === "kg" ? v : Math.round(v / 2.205))
              }}
              className="w-full accent-accent"
            />
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What&apos;s your ethnicity?</h2>
            <p className="text-text-secondary mb-6 text-sm">Optional — helps calibrate analysis</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ETHNICITIES.map((e) => (
                <button
                  key={e}
                  onClick={() => setEthnicity(e)}
                  className={`px-4 py-2 rounded-full text-sm border transition-all active:scale-95 ${
                    ethnicity === e
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-card text-text-secondary hover:border-accent/30"
                  }`}
                >{e}</button>
              ))}
            </div>
            <button
              onClick={() => { setEthnicity(undefined); next() }}
              className="text-sm text-text-muted hover:text-accent transition-colors"
            >Skip</button>
          </div>
        )}

        {step === 6 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">What are your goals?</h2>
            <p className="text-text-secondary mb-6">Select all that apply.</p>
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => toggleGoal(g)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all active:scale-[0.99] ${
                    goals.includes(g)
                      ? "border-accent bg-accent/10 text-text-primary"
                      : "border-border bg-card text-text-secondary hover:border-accent/30"
                  }`}
                >{g}</button>
              ))}
            </div>
          </div>
        )}

        {step === 7 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">How familiar are you with looksmaxxing?</h2>
            <div className="space-y-3">
              {EXPERIENCE.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setExperience(e.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all active:scale-[0.99] ${
                    experience === e.id
                      ? "border-accent bg-accent/10"
                      : "border-border bg-card hover:border-accent/30"
                  }`}
                >
                  <div className="font-semibold">{e.label}</div>
                  <div className="text-sm text-text-secondary mt-1">{e.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 8 && (
          <div>
            <h2 className="text-2xl font-bold mb-2">You&apos;re all set!</h2>
            <p className="text-text-secondary mb-6">Here&apos;s a summary of your profile.</p>
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3 text-sm">
              <Row label="Gender" value={gender ?? ""} />
              <Row label="Age" value={`${age}`} />
              <Row label="Height" value={`${heightCm} cm`} />
              <Row label="Weight" value={`${weightKg} kg`} />
              {ethnicity && <Row label="Ethnicity" value={ethnicity} />}
              <Row label="Goals" value={goals.join(", ")} />
              <Row label="Experience" value={EXPERIENCE.find((e) => e.id === experience)?.label ?? ""} />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8 pt-4 border-t border-border">
        {step > 1 && step < 8 && (
          <button
            onClick={back}
            className="flex-1 py-3 rounded-xl border border-border bg-card font-medium hover:border-accent/40 active:scale-[0.98] transition-all"
          >Back</button>
        )}
        <button
          onClick={next}
          disabled={!canProceed()}
          className={`flex-1 py-3 rounded-xl font-semibold transition-all active:scale-[0.98] ${
            canProceed()
              ? "bg-accent text-white hover:brightness-110 glow-accent-sm"
              : "bg-border text-text-muted cursor-not-allowed"
          }`}
        >
          {step === 8 ? "Start Scanning" : "Next"}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-text-muted">{label}</span>
      <span className="text-text-primary text-right capitalize">{value}</span>
    </div>
  )
}
