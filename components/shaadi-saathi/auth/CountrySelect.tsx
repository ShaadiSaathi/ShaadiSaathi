"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { getCountryCallingCode } from "react-phone-number-input"
import flags from "react-phone-number-input/flags"

/**
 * Custom country picker for `react-phone-number-input`'s `countrySelectComponent`.
 *
 * The library's default country selector is an unstyled native <select>. This
 * replacement is:
 *  - fully styled to the maroon/gold/ivory system,
 *  - searchable (filter 200+ countries by name, ISO code, or dial code),
 *  - a comfortable bottom-sheet on mobile and an anchored dropdown on desktop.
 *
 * The panel is rendered through a portal to <body> so it can never be clipped
 * or mis-positioned by an ancestor that establishes a containing block for
 * fixed positioning (e.g. the auth card uses `backdrop-blur`).
 */

type CountryCode = string

interface CountryOption {
  value?: CountryCode
  label: string
  divider?: boolean
}

interface CountrySelectProps {
  value?: CountryCode
  onChange: (value?: CountryCode) => void
  options: CountryOption[]
  name?: string
  disabled?: boolean
  readOnly?: boolean
}

interface PanelRect {
  top: number
  left: number
  width: number
}

const DESKTOP_PANEL_WIDTH = 320

function dialFor(code: CountryCode): string {
  try {
    return getCountryCallingCode(code as never)
  } catch {
    return ""
  }
}

function Flag({ code, title }: { code: CountryCode; title?: string }) {
  const FlagComponent = (flags as Record<string, React.ComponentType<{ title?: string }>>)[code]
  return (
    <span className="flex h-4 w-6 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-maroon/5 ring-1 ring-black/5 [&_svg]:h-full [&_svg]:w-full [&_svg]:object-cover">
      {FlagComponent ? <FlagComponent title={title} /> : null}
    </span>
  )
}

export default function CountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [rect, setRect] = useState<PanelRect | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia("(max-width: 639px)")
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const updateRect = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const maxLeft = window.innerWidth - DESKTOP_PANEL_WIDTH - 8
    const left = Math.max(8, Math.min(r.left, maxLeft))
    setRect({ top: r.bottom + 8, left, width: DESKTOP_PANEL_WIDTH })
  }, [])

  useEffect(() => {
    if (!open) return
    if (!isMobile) updateRect()

    function onReflow() {
      if (!isMobile) updateRect()
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }

    window.addEventListener("scroll", onReflow, true)
    window.addEventListener("resize", onReflow)
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    const focusTimer = setTimeout(() => searchRef.current?.focus(), 40)

    // Lock background scroll while the mobile sheet is open.
    const prevOverflow = document.body.style.overflow
    if (isMobile) document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("scroll", onReflow, true)
      window.removeEventListener("resize", onReflow)
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
      clearTimeout(focusTimer)
      document.body.style.overflow = prevOverflow
    }
  }, [open, isMobile, updateRect])

  const countries = useMemo(
    () =>
      options
        .filter((o) => Boolean(o.value))
        .map((o) => ({ code: o.value as string, name: o.label, dial: dialFor(o.value as string) })),
    [options]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return countries
    const digits = q.replace(/\D/g, "")
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (digits.length > 0 && c.dial.includes(digits))
    )
  }, [countries, query])

  function toggle() {
    setQuery("")
    setOpen((o) => !o)
  }

  function select(code: CountryCode) {
    onChange(code)
    setOpen(false)
    setQuery("")
    triggerRef.current?.focus()
  }

  const currentDial = value ? dialFor(value) : ""

  const panel = (
    <>
      {isMobile && (
        <div
          className="fixed inset-0 z-[60] bg-maroon-dark/40"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
      <div
        ref={panelRef}
        role="listbox"
        aria-label="Select a country"
        style={isMobile || !rect ? undefined : { top: rect.top, left: rect.left, width: rect.width }}
        className={
          isMobile
            ? "fixed inset-x-0 bottom-0 z-[70] flex max-h-[82dvh] flex-col overflow-hidden rounded-t-2xl border border-gold/25 bg-ivory shadow-2xl"
            : "fixed z-[70] flex max-h-[22rem] flex-col overflow-hidden rounded-2xl border border-gold/25 bg-ivory shadow-xl"
        }
      >
        {isMobile && (
          <div className="flex shrink-0 justify-center pt-2.5 pb-1" aria-hidden="true">
            <span className="h-1.5 w-10 rounded-full bg-maroon/15" />
          </div>
        )}
        <div className="shrink-0 border-b border-gold/15 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-gold/25 bg-white px-3">
            <svg
              className="h-4 w-4 shrink-0 text-maroon/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country or code"
              aria-label="Search countries"
              className="min-h-[44px] w-full min-w-0 bg-transparent text-sm text-maroon-dark placeholder:text-maroon/40 focus:outline-none"
            />
          </div>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-maroon/50">No countries found</li>
          )}
          {filtered.map((c) => {
            const active = c.code === value
            return (
              <li key={c.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => select(c.code)}
                  className={`flex min-h-[48px] w-full items-center gap-3 px-4 text-left text-sm transition-colors ${
                    active ? "bg-maroon/10 text-maroon-dark" : "text-maroon/80 hover:bg-gold/10"
                  }`}
                >
                  <Flag code={c.code} title={c.name} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 tabular-nums text-maroon/50">+{c.dial}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )

  return (
    <div className="flex">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled || readOnly}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Country code${currentDial ? `, currently +${currentDial}` : ""}`}
        className="flex min-h-[44px] items-center gap-1.5 rounded-l-xl border-r border-gold/20 bg-white/70 px-3 text-sm font-medium text-maroon/70 transition-colors hover:bg-white disabled:opacity-60"
      >
        {value ? <Flag code={value} title={value} /> : <span className="h-4 w-6" />}
        <span className="tabular-nums text-maroon-dark">+{currentDial}</span>
        <svg
          className={`h-4 w-4 text-maroon/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {mounted && open && createPortal(panel, document.body)}
    </div>
  )
}
