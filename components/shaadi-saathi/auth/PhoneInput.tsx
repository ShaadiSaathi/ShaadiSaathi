"use client"

import { formatPhoneDisplay, normalizePhone } from "./authValidation"

interface PhoneInputProps {
  id: string
  label?: string
  value: string
  onChange: (digits: string) => void
  error?: string | null
  required?: boolean
}

/** Pakistan phone input with +92 prefix */
export default function PhoneInput({
  id,
  label = "Phone number",
  value,
  onChange,
  error,
  required = true,
}: PhoneInputProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-maroon/70">
        {label}
      </label>
      <div className="flex overflow-hidden rounded-xl border border-gold/25 bg-ivory focus-within:border-maroon/40 focus-within:ring-2 focus-within:ring-maroon/10">
        <span
          className="flex items-center border-r border-gold/20 bg-white/80 px-3 text-sm font-medium text-maroon/60"
          aria-hidden="true"
        >
          +92
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          required={required}
          placeholder="3XX XXX XXXX"
          value={formatPhoneDisplay(value)}
          onChange={(e) => onChange(normalizePhone(e.target.value))}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-maroon-dark placeholder:text-maroon/35 focus:outline-none"
        />
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
