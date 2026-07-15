"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "./AuthContext"
import OtpVerification from "./OtpVerification"

type SendState = "idle" | "sending" | "sent" | "error"

interface FirebaseOtpGateProps {
  phone: string
  onVerify: (code: string) => void | Promise<void>
  verifyLoading?: boolean
  verifyError?: string | null
  submitLabel?: string
}

/**
 * Drives the full, REAL phone-verification lifecycle:
 *  - renders the reCAPTCHA container and requests a genuine OTP on mount
 *  - surfaces a friendly error + Retry button if the send fails or times out
 *  - only reveals the 6-digit entry once Firebase has actually sent a code
 *
 * There is deliberately no mock/dev shortcut: if a code can't be genuinely
 * sent (e.g. Firebase misconfigured) the user sees an error and can never
 * reach a state where an unverified code is accepted.
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

  const doSend = useCallback(async () => {
    setSendError(null)
    setSendState("sending")
    try {
      await sendOtp()
      setSendState("sent")
    } catch (err) {
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

  const handleRetry = useCallback(async () => {
    resetOtp()
    await doSend()
  }, [resetOtp, doSend])

  if (sendState !== "sent") {
    return (
      <div className="space-y-4">
        <p className="text-center text-sm text-maroon/70">
          {sendState === "error"
            ? "We couldn't send your code."
            : "Confirm you're not a robot, then we'll text your code."}
        </p>
        <div className="flex min-h-[78px] justify-center">
          <div id="recaptcha-container" className="[&_iframe]:rounded-lg" />
        </div>
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
            <button
              type="button"
              onClick={handleRetry}
              className="mx-auto block rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-ivory transition hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon/30"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 flex min-h-[1px] justify-center">
        <div id="recaptcha-container" className="[&_iframe]:rounded-lg" />
      </div>
      <OtpVerification
        phone={phone}
        onVerify={onVerify}
        onResend={handleRetry}
        loading={verifyLoading}
        error={verifyError}
        submitLabel={submitLabel}
      />
    </>
  )
}
