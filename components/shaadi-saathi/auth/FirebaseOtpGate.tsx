"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { OtpChannel } from "@/lib/auth/otp-client"
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
 * WhatsApp-first OTP gate (Twilio Verify via /api/auth/*).
 * Sends on mount, surfaces Retry on failure, and only reveals the 6-digit
 * entry after a genuine successful send. SMS fallback is offered after send.
 */
export default function FirebaseOtpGate({
  phone,
  onVerify,
  verifyLoading,
  verifyError,
  submitLabel,
}: FirebaseOtpGateProps) {
  const { sendOtp, resetOtp, lastOtpChannel } = useAuth()
  const [sendState, setSendState] = useState<SendState>("idle")
  const [sendError, setSendError] = useState<string | null>(null)
  const [channel, setChannel] = useState<OtpChannel>("whatsapp")
  const [smsFallbackLoading, setSmsFallbackLoading] = useState(false)
  const startedRef = useRef(false)

  const doSend = useCallback(
    async (nextChannel: OtpChannel = "whatsapp") => {
      setSendError(null)
      setSendState("sending")
      try {
        const used = await sendOtp(nextChannel)
        setChannel(used)
        setSendState("sent")
      } catch (err) {
        setSendError(
          err instanceof Error
            ? err.message
            : "We couldn't send your code. Please try again."
        )
        setSendState("error")
      }
    },
    [sendOtp]
  )

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void doSend("whatsapp")
  }, [doSend])

  const handleRetry = useCallback(async () => {
    resetOtp()
    await doSend(channel)
  }, [resetOtp, doSend, channel])

  const handleSmsFallback = useCallback(async () => {
    setSmsFallbackLoading(true)
    resetOtp()
    try {
      await doSend("sms")
    } finally {
      setSmsFallbackLoading(false)
    }
  }, [resetOtp, doSend])

  const sent = sendState === "sent"
  const activeChannel = sent ? lastOtpChannel || channel : channel

  return (
    <div className="space-y-5">
      {!sent && (
        <p className="text-center text-sm leading-relaxed text-maroon/70">
          {sendState === "error"
            ? "We couldn't send your code."
            : "We'll send a 6-digit code to your WhatsApp."}
        </p>
      )}

      {sendState === "sending" && (
        <p className="text-center text-sm text-maroon/60" role="status">
          {channel === "sms"
            ? "Sending your code via SMS…"
            : "Sending your code on WhatsApp…"}
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
            className="mx-auto flex min-h-[44px] items-center justify-center rounded-full bg-maroon px-6 py-2.5 text-sm font-semibold text-ivory transition hover:bg-maroon-dark focus:outline-none focus:ring-2 focus:ring-maroon/30"
          >
            Retry
          </button>
          {channel !== "sms" && (
            <button
              type="button"
              onClick={handleSmsFallback}
              disabled={smsFallbackLoading}
              className="mx-auto flex min-h-[44px] items-center justify-center px-4 text-sm font-medium text-maroon hover:text-gold-dark disabled:opacity-60"
            >
              Didn&apos;t get it on WhatsApp? Send via SMS instead
            </button>
          )}
        </div>
      )}

      {sent && (
        <OtpVerification
          phone={phone}
          channel={activeChannel}
          onVerify={onVerify}
          onResend={handleRetry}
          onSmsFallback={
            activeChannel === "whatsapp" ? handleSmsFallback : undefined
          }
          smsFallbackLoading={smsFallbackLoading}
          loading={verifyLoading}
          error={verifyError}
          submitLabel={submitLabel}
        />
      )}
    </div>
  )
}
