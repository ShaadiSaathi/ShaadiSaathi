"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { clearRecaptcha } from "@/lib/firebase/phone-auth"
import { useAuth } from "./AuthContext"
import OtpVerification from "./OtpVerification"

type SendState = "idle" | "captcha" | "sending" | "sent" | "error"

interface FirebaseOtpGateProps {
  phone: string
  onVerify: (code: string) => void | Promise<void>
  verifyLoading?: boolean
  verifyError?: string | null
  submitLabel?: string
}

/**
 * Drives the full, REAL phone-verification lifecycle:
 *  - shows the reCAPTCHA checkbox and waits for the user to complete it
 *  - only then requests a genuine OTP (send timeout no longer includes captcha)
 *  - surfaces a friendly error + Retry button if the send fails
 *  - only reveals the 6-digit entry once Firebase has accepted the send
 */
export default function FirebaseOtpGate({
  phone,
  onVerify,
  verifyLoading,
  verifyError,
  submitLabel,
}: FirebaseOtpGateProps) {
  const { sendOtp, resetOtp } = useAuth()
  const [sendState, setSendState] = useState<SendState>("idle")
  const [sendError, setSendError] = useState<string | null>(null)
  const startedRef = useRef(false)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      clearRecaptcha()
    }
  }, [])

  const doSend = useCallback(async () => {
    setSendError(null)
    setSendState("captcha")
    try {
      await sendOtp()
      if (!aliveRef.current) return
      setSendState("sent")
    } catch (err) {
      if (!aliveRef.current) return
      setSendError(
        err instanceof Error
          ? err.message
          : "We couldn't send your code. Please try again."
      )
      setSendState("error")
    }
  }, [sendOtp])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void doSend()
  }, [doSend])

  // Once sendOtp moves past captcha into the timed SMS request, flip UI copy.
  useEffect(() => {
    if (sendState !== "captcha") return
    const t = window.setInterval(() => {
      const el = document.getElementById("recaptcha-container")
      // Heuristic: after checkbox solve, Firebase often collapses/replaces the
      // widget; show "Sending…" as soon as we detect the challenge completed
      // via aria or by watching for the sending phase from a parent update.
      if (el?.querySelector('[aria-checked="true"]')) {
        setSendState((s) => (s === "captcha" ? "sending" : s))
      }
    }, 400)
    return () => window.clearInterval(t)
  }, [sendState])

  const handleRetry = useCallback(async () => {
    resetOtp()
    clearRecaptcha()
    startedRef.current = true
    await doSend()
  }, [resetOtp, doSend])

  const sent = sendState === "sent"

  return (
    <div className="space-y-5">
      {!sent && (
        <p className="text-center text-sm leading-relaxed text-maroon/70">
          {sendState === "error"
            ? "We couldn't send your code."
            : sendState === "sending"
              ? "Sending your code…"
              : "Confirm you're not a robot below, then we'll text your code."}
        </p>
      )}

      <div
        className={
          sent
            ? "h-0 overflow-hidden"
            : "flex min-h-[78px] items-center justify-center py-2"
        }
        aria-hidden={sent}
      >
        <div id="recaptcha-container" className="[&_iframe]:rounded-lg" />
      </div>

      {sendState === "captcha" && (
        <p className="text-center text-sm text-maroon/60" role="status">
          Tick the reCAPTCHA checkbox to continue.
        </p>
      )}

      {sendState === "sending" && (
        <p className="text-center text-sm text-maroon/60" role="status">
          Sending your code…
        </p>
      )}

      {sendState === "error" && (
        <div className="space-y-3">
          <p className="text-center text-xs text-rose-600" role="alert">
            {sendError}
          </p>
          <p className="text-center text-xs text-maroon/55">
            If you already requested several codes, wait a few minutes before
            retrying — carriers often delay or drop rapid SMS.
          </p>
          <button
            type="button"
            onClick={() => void handleRetry()}
            className="mx-auto flex min-h-[44px] items-center justify-center rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-ivory transition hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon/30"
          >
            Retry
          </button>
        </div>
      )}

      {sent && (
        <>
          <OtpVerification
            phone={phone}
            onVerify={onVerify}
            onResend={handleRetry}
            loading={verifyLoading}
            error={verifyError}
            submitLabel={submitLabel}
          />
          <p className="text-center text-xs text-maroon/50">
            Didn&apos;t get a text? Wait 2–3 minutes before resending — rapid
            retries are the most common reason codes stop arriving.
          </p>
        </>
      )}
    </div>
  )
}
