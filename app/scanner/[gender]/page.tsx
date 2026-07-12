"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { AppShell } from "@/components/sidebar"
import { BellCurve } from "@/components/bell-curve"
import { MetricCard } from "@/components/metric-card"
import { ScoreCard } from "@/components/score-card"
import { calculateScores, type FaceResults } from "@/lib/face-analysis"
import { validateFrontalUpload } from "@/lib/face-pose-mp"
import { prepareFrontAnalysis, validateFrontImageQuality } from "@/lib/front-face-measurements-mp"
import { getMediaPipeDetector, detectFaceLandmarks } from "@/lib/mediapipe-detector"
import { addScanRecord, getUserProfile } from "@/utils/storage"

type Phase = "idle" | "scanning" | "results" | "error"

const SCAN_STEPS = [
  "Locating face region",
  "Mapping 478 facial landmarks",
  "Running detection pass 1 / 3",
  "Running detection pass 2 / 3",
  "Running detection pass 3 / 3",
  "Computing FWHR & proportions",
  "Analysing symmetry & harmony",
  "Generating your report",
]

export default function ScannerPage() {
  const params = useParams()
  const router = useRouter()
  const rawGender = params.gender as string
  const gender = rawGender === "female" ? "female" : "male"
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (rawGender?.startsWith("side-")) {
      const sideGender = rawGender.replace(/^side-/, "")
      router.replace(`/scanner/side-${sideGender === "female" ? "female" : "male"}`)
    }
  }, [rawGender, router])

  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<Phase>("idle")
  const [preview, setPreview] = useState("")
  const [results, setResults] = useState<FaceResults | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [completedSteps, setCompletedSteps] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    const profile = getUserProfile()
    if (!profile) {
      router.replace("/login")
      return
    }
    getMediaPipeDetector().catch(() => {})
    setReady(true)
  }, [router])

  const advanceSteps = useCallback(async () => {
    for (let i = 0; i < SCAN_STEPS.length; i++) {
      setActiveStep(i)
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300))
      setCompletedSteps(i + 1)
    }
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file)
      setPreview(url)
      setResults(null)
      setErrorMsg("")
      setCompletedSteps(0)
      setActiveStep(0)
      setPhase("scanning")

      const stepPromise = advanceSteps()

      try {
        await getMediaPipeDetector()

        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const el = new Image()
          el.onload = () => res(el)
          el.onerror = rej
          el.src = url
        })

        const result = await detectFaceLandmarks(img, 3)
        if (!result) {
          await stepPromise
          setErrorMsg("No face detected. Use a clear front-facing photo with good lighting.")
          setPhase("error")
          return
        }

        const poseCheck = validateFrontalUpload(result.pixelLandmarks)
        if (!poseCheck.ok) {
          await stepPromise
          setErrorMsg(poseCheck.message)
          setPhase("error")
          return
        }

        const prep = prepareFrontAnalysis(result.pixelLandmarks)
        const quality = validateFrontImageQuality(prep)
        if (!quality.ok) {
          await stepPromise
          setErrorMsg(quality.message)
          setPhase("error")
          return
        }

        const scores = calculateScores(prep.normalized, gender)
        await stepPromise

        setResults(scores)
        addScanRecord({
          gender,
          scanType: "front",
          overall: scores.overall,
          breakdown: scores.breakdown,
        })
        setPhase("results")
      } catch (err) {
        await stepPromise
        setErrorMsg(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`)
        setPhase("error")
      }
    },
    [advanceSteps, gender]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith("image/")) processFile(file)
  }

  function reset() {
    setPhase("idle")
    setPreview("")
    setResults(null)
    setErrorMsg("")
    setCompletedSteps(0)
    setActiveStep(0)
    if (fileRef.current) fileRef.current.value = ""
  }

  if (!ready || rawGender?.startsWith("side-")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const scannerHref = `/scanner/${gender}`
  const profileHref = `/scanner/side-${gender}`

  return (
    <AppShell scannerHref={scannerHref} profileHref={profileHref}>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">
          Face Scanner — <span className="capitalize text-accent">{gender}</span>
        </h1>
        <p className="text-text-secondary mb-8">
          Upload a front-facing photo for clinical-grade facial analysis.
        </p>

        {(phase === "idle" || phase === "error") && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all active:scale-[0.99] ${
              dragOver
                ? "border-accent bg-accent/5 glow-accent-sm"
                : "border-border bg-card hover:border-accent/40"
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
            />
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <p className="font-semibold mb-1">Upload a front-facing photo</p>
            <p className="text-sm text-text-muted">
              For best results: neutral expression, good lighting, no sunglasses
            </p>
            {phase === "error" && (
              <p className="mt-4 text-sm text-error">{errorMsg}</p>
            )}
          </div>
        )}

        {phase === "scanning" && (
          <div className="space-y-6">
            {preview && (
              <div className="rounded-2xl overflow-hidden border border-border bg-card">
                <img src={preview} alt="Preview" className="w-full max-h-72 object-contain mx-auto" />
              </div>
            )}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
                Analyzing
              </h2>
              <ul className="space-y-3">
                {SCAN_STEPS.map((step, i) => {
                  const done = i < completedSteps
                  const active = i === activeStep && !done
                  return (
                    <li key={step} className="flex items-center gap-3 text-sm">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                          done
                            ? "bg-success/20 border-success text-success check-pop"
                            : active
                              ? "border-accent text-accent scan-pulse"
                              : "border-border text-text-muted"
                        }`}
                      >
                        {done ? (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </span>
                      <span className={done ? "text-text-primary" : active ? "text-accent" : "text-text-muted"}>
                        {step}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {phase === "results" && results && (
          <div className="space-y-6">
            {preview && (
              <div className="rounded-2xl overflow-hidden border border-border bg-card">
                <img src={preview} alt="Scanned" className="w-full max-h-56 object-contain mx-auto" />
              </div>
            )}

            <ScoreCard score={results.overall} />
            <BellCurve score={results.overall} />

            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Metric Breakdown</h2>
              {results.breakdown.map((metric, i) => (
                <MetricCard key={i} metric={metric} />
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full py-3.5 rounded-xl border border-border bg-card font-semibold hover:border-accent/40 active:scale-[0.98] transition-all"
            >
              Scan Again
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
