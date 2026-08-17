"use client"

import PhoneInputWithCountry from "react-phone-number-input"
import CountrySelect from "./CountrySelect"

interface PhoneInputProps {
  id: string
  label?: string
  /** Phone value in E.164 format (e.g. "+923001234567"), or "" when empty. */
  value: string
  onChange: (value: string) => void
  error?: string | null
  required?: boolean
}

/**
 * International phone input. Collects any country's number and always emits a
 * proper E.164 string (e.g. +923001234567, +447911123456) — the exact format
 * Firebase phone auth requires. Defaults to Pakistan (+92) but is fully
 * changeable via a searchable, mobile-friendly country picker.
 */
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
      <div
        className={`shaadi-auth-input flex items-stretch overflow-visible rounded-xl border bg-ivory p-0 transition-[border-color,box-shadow] duration-150 focus-within:ring-0 ${
          error
            ? "border-rose-300 focus-within:border-rose-400 focus-within:shadow-[0_0_0_3px_rgb(231_76_60_/_0.1)]"
            : "border-gold/25 focus-within:border-maroon/38 focus-within:shadow-[0_0_0_3px_rgb(106_27_77_/_0.12)]"
        }`}
      >
        <PhoneInputWithCountry
          defaultCountry="PK"
          addInternationalOption={false}
          value={value || undefined}
          onChange={(v) => onChange(v ?? "")}
          countrySelectComponent={CountrySelect}
          className="ss-phone-input flex w-full items-stretch"
          numberInputProps={{
            id,
            required,
            "aria-invalid": Boolean(error),
            "aria-describedby": errorId,
            placeholder: "300 1234567",
            className:
              "min-w-0 flex-1 bg-transparent px-3 py-3 text-maroon-dark placeholder:text-maroon/35 focus:outline-none",
          }}
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
