"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useEffect, useState } from "react"
import { motionTransitionIfMotion } from "@/lib/design/motion-tokens"

type ToastVariant = "success" | "error"

interface AppToastProps {
  message: string | null
  variant?: ToastVariant
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-200/80 bg-emerald-50 text-emerald-900",
  error: "border-rose-200/80 bg-rose-50 text-rose-900",
}

/** Fixed bottom toast — slide/fade using shared motion tokens. */
export function AppToast({ message, variant = "success" }: AppToastProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 safe-bottom"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {message ? (
          <motion.p
            key={message}
            role="status"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReducedMotion
                ? undefined
                : { opacity: 0, y: 8, scale: 0.98, transition: motionTransitionIfMotion(false, "micro") }
            }
            transition={motionTransitionIfMotion(prefersReducedMotion, "standard")}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium shadow-md shadow-black/5 ${variantStyles[variant]}`}
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

/** Auto-dismiss toast state for app routes. */
export function useAppToast(autoDismissMs = 2800) {
  const [message, setMessage] = useState<string | null>(null)
  const [variant, setVariant] = useState<ToastVariant>("success")

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), autoDismissMs)
    return () => window.clearTimeout(timer)
  }, [message, autoDismissMs])

  function showToast(text: string, toastVariant: ToastVariant = "success") {
    setVariant(toastVariant)
    setMessage(text)
  }

  return { message, variant, showToast, clearToast: () => setMessage(null) }
}
