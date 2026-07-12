"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { AppShell } from "@/components/sidebar"
import { getMediaPipeDetector, detectFaceLandmarks } from "@/lib/mediapipe-detector"
import { validateSideProfile } from "@/lib/side-profile-measurements"
import { scoreSideProfile } from "@/lib/side-profile-scoring"
import type { FaceResults } from "@/lib/face-analysis"
import { addScanRecord, getUserProfile } from "@/utils/storage"

const STEPS = [
  "Locating face region",
  "Mapping 478 facial landmarks",
  "Detecting profile orientation",
  "Running detection pass 1 / 3",
  "Running detection pass 2 / 3",
  "Running detection pass 3 / 3",
  "Computing nasofrontal angle",
  "Measuring nasolabial angle",
  "Analysing gonial angle",
  "Computing E-line projection",
  "Measuring facial convexity",
  "Generating your report",
]

type State = "idle" | "loading-models" | "scanning" | "done" | "error"

type SideProfileScannerProps = {
  gender: "male" | "female"
}

export function SideProfileScanner({ gender }: SideProfileScannerProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<State>("idle")
  const [preview, setPreview] = useState("")
  const [results, setResults] = useState<FaceResults | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [modelError, setModelError] = useState("")
  const [modelsReady, setModelsReady] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const scannerHref = `/scanner/${gender}`
  const profileHref = `/scanner/side-${gender}`

  useEffect(() => {
    const profile = getUserProfile()
    if (!profile) {
      router.replace("/login")
      return
    }
    setReady(true)

    getMediaPipeDetector()
      .then(() => {
        setModelsReady(true)
        setModelError("")
      })
      .catch((err) => {
        setModelError(
          `Could not load face analysis model: ${err instanceof Error ? err.message : "unknown error"}. Check your connection and refresh.`
        )
      })
  }, [router])

  async function handleFile(file: File) {
    if (modelError) return

    const url = URL.createObjectURL(file)
    setPreview(url)
    setResults(null)
    setErrorMsg("")
    setCurrentStep(0)

    try {
      if (!modelsReady) {
        setState("loading-models")
        await getMediaPipeDetector()
        setModelsReady(true)
      }
      setState("scanning")

      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = new Image()
        el.onload = () => res(el)
        el.onerror = () => rej(new Error("Could not load image file."))
        el.src = url
      })

      setCurrentStep(1)
      const result = await detectFaceLandmarks(img, 3)
      if (!result) {
        setErrorMsg("No face detected. Use a clear side-profile photo with good lighting.")
        setState("error")
        return
      }

      setCurrentStep(2)
      const sideCheck = validateSideProfile(result.pixelLandmarks)
      if (!sideCheck.ok) {
        setErrorMsg(sideCheck.message)
        setState("error")
        return
      }

      for (let i = 3; i < STEPS.length - 1; i++) {
        setCurrentStep(i)
        await new Promise((r) => setTimeout(r, 300))
      }

      setCurrentStep(STEPS.length - 1)
      const scores = scoreSideProfile(result.pixelLandmarks, gender)
      setResults(scores)
      setState("done")

      addScanRecord({
        gender,
        scanType: "profile",
        overall: scores.overall,
        breakdown: scores.breakdown,
      })
      localStorage.setItem("chatSeed", scores.chatSeed)
      localStorage.setItem("lastScanResults", scores.chatSeed)
    } catch (err) {
      setErrorMsg(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`)
      setState("error")
    }
  }

  function reset() {
    setState("idle")
    setPreview("")
    setResults(null)
    setErrorMsg("")
    setCurrentStep(0)
    if (fileRef.current) fileRef.current.value = ""
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <AppShell scannerHref={scannerHref} profileHref={profileHref}>
      <div className="p-6 lg:p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1 text-text-primary">
          Side Profile Scanner — <span className="capitalize text-accent">{gender}</span>
        </h1>
        <p className="text-text-secondary mb-6">Cephalometric facial analysis</p>

        {modelError && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6 text-sm text-error">
            {modelError}
          </div>
        )}

        <label
          className={`block border-2 border-dashed rounded-xl p-8 text-center transition mb-6 ${
            modelError
              ? "border-border opacity-50 cursor-not-allowed"
              : "border-border cursor-pointer hover:border-accent/50 bg-card"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={!!modelError}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ""
            }}
          />
          {preview ? (
            <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-lg object-contain" />
          ) : (
            <div>
              <p className="text-text-primary font-semibold mb-2">Upload a side-profile photo</p>
              <p className="text-text-muted text-sm">
                Left or right side. Look straight ahead, hair behind ear, good lighting.
              </p>
            </div>
          )}
        </label>

        {state === "loading-models" && (
          <p className="text-accent-tertiary mb-4">Loading face analysis model…</p>
        )}

        {state === "scanning" && (
          <div className="space-y-2 mb-6 rounded-xl border border-border bg-card p-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    i < currentStep
                      ? "bg-success text-white"
                      : i === currentStep
                        ? "bg-accent-tertiary text-white animate-pulse"
                        : "bg-border text-text-muted"
                  }`}
                >
                  {i < currentStep ? "✓" : ""}
                </div>
                <span className={i <= currentStep ? "text-text-primary" : "text-text-muted"}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="bg-error/10 border border-error/30 rounded-xl p-4 mb-6">
            <p className="text-error text-sm">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-3 text-sm text-accent hover:underline"
            >
              Try another photo
            </button>
          </div>
        )}

        {state === "done" && results && (
          <div>
            <div className="bg-gradient-to-br from-accent/20 to-bg border border-accent/30 rounded-2xl p-6 mb-6 text-center">
              <p className="text-text-secondary text-sm mb-1">SIDE PROFILE SCORE</p>
              <div className="text-6xl font-bold text-accent">{results.overall}</div>
              <div className="text-text-muted">/ 100</div>
            </div>

            <h2 className="text-lg font-semibold mb-4 text-text-primary">Metric Breakdown</h2>
            <div className="space-y-3">
              {results.breakdown.map((b, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="font-semibold text-sm text-text-primary">{b.label}</span>
                    <div className="text-right shrink-0">
                      <span className="text-text-muted text-xs mr-2">
                        {Math.round(b.confidence * 100)}% conf
                      </span>
                      <span
                        className={`font-bold ${
                          b.unreliable
                            ? "text-text-muted"
                            : b.score >= 78
                              ? "text-success"
                              : b.score >= 52
                                ? "text-warning"
                                : "text-error"
                        }`}
                      >
                        {b.unreliable ? "N/A" : `${b.score}/100`}
                      </span>
                    </div>
                  </div>
                  {!b.unreliable && (
                    <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${
                          b.score >= 78
                            ? "bg-success"
                            : b.score >= 52
                              ? "bg-warning"
                              : "bg-error"
                        }`}
                        style={{ width: `${b.score}%` }}
                      />
                    </div>
                  )}
                  <div className="text-xs text-text-secondary">
                    Measured: <span className="text-text-primary">{b.measured}</span>
                    {"  "}Ideal: <span className="text-success">{b.ideal}</span>
                  </div>
                  <div className="text-xs text-text-muted mt-1">{b.tip}</div>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="w-full mt-6 py-3 bg-accent hover:brightness-110 rounded-xl font-semibold text-white transition active:scale-[0.98]"
            >
              Scan Again
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
