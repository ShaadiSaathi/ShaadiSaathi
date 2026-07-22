"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { formatPhoneNumberIntl } from "react-phone-number-input"
import AuthSubmitButton from "./AuthSubmitButton"

interface OtpVerificationProps {
  phone: string
  onVerify: (code: string) => void
  onResend?: () => void | Promise<void>
  loading?: boolean
  error?: string | null
  submitLabel?: string
}

/** Reusable 6-digit OTP entry with resend countdown */
export default function OtpVerification({
  phone,
  onVerify,
  onResend,
  loading = false,
  error,
  submitLabel = "Verify",
}: OtpVerificationProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""))
  const [countdown, setCountdown] = useState(30)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }, [])

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus()
      }
    },
    [digits]
  )

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = Array(6).fill("")
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, 5)]?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onVerify(digits.join(""))
  }

  // `phone` is an E.164 string (e.g. "+447911123456"); show it nicely formatted
  // for whatever country the user chose, falling back to the raw value.
  const prettyPhone = formatPhoneNumberIntl(phone) || phone

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <p className="text-center text-sm leading-relaxed text-maroon/70">
        Enter the 6-digit code we sent to{" "}
        <span className="font-medium text-maroon-dark">{prettyPhone}</span>
      </p>

      <div
        className="flex justify-center gap-2 sm:gap-3"
        role="group"
        aria-label="6-digit verification code"
        onPaste={handlePaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            aria-label={`Digit ${i + 1} of 6`}
            className="h-14 w-full min-w-0 max-w-[3.25rem] flex-1 basis-0 rounded-xl border border-gold/25 bg-ivory text-center text-xl font-semibold text-maroon-dark focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/15 sm:h-16"
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-xs leading-relaxed text-rose-600" role="alert">
          {error}
        </p>
      )}

      <AuthSubmitButton loading={loading} disabled={digits.some((d) => !d)}>
        {submitLabel}
      </AuthSubmitButton>

      <div className="text-center text-sm text-maroon/50">
        {countdown > 0 ? (
          <p>Resend code in 0:{String(countdown).padStart(2, "0")}</p>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setCountdown(30)
              if (onResend) await onResend()
            }}
            className="inline-flex min-h-[44px] items-center justify-center px-4 font-medium text-maroon hover:text-gold-dark"
          >
            Resend code
          </button>
        )}
      </div>
    </form>
  )
}
