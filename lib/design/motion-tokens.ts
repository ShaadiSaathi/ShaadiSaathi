import type { Transition } from "framer-motion"

/** Signature snappy easing — shared app-wide (not cinematic landing pace). */
export const MOTION_EASE = [0.22, 1, 0.36, 1] as const

export const MOTION_DURATION = {
  /** Micro-interactions: checkboxes, presses, field focus (~160ms) */
  micro: 0.16,
  /** Standard UI transitions: page enter, toasts, row highlights (~280ms) */
  standard: 0.28,
} as const

export const motionTransition = {
  micro: {
    duration: MOTION_DURATION.micro,
    ease: MOTION_EASE,
  } satisfies Transition,
  standard: {
    duration: MOTION_DURATION.standard,
    ease: MOTION_EASE,
  } satisfies Transition,
  springMicro: {
    type: "spring",
    stiffness: 520,
    damping: 32,
    mass: 0.6,
  } satisfies Transition,
} as const

/** CSS-friendly copies for Tailwind arbitrary values and globals.css */
export const MOTION_CSS = {
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
  microMs: "180ms",
  standardMs: "280ms",
} as const

export function motionTransitionIfMotion(
  prefersReducedMotion: boolean | null,
  key: keyof typeof motionTransition = "micro"
): Transition {
  if (prefersReducedMotion) return { duration: 0 }
  return motionTransition[key]
}
