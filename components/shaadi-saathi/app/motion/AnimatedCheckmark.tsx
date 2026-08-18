"use client"

import { motion, useReducedMotion } from "framer-motion"
import { motionTransitionIfMotion } from "@/lib/design/motion-tokens"

interface AnimatedCheckmarkProps {
  className?: string
}

/** Check-mark path draw-in for task completion and similar toggles. */
export default function AnimatedCheckmark({ className = "h-3.5 w-3.5 md:h-3 md:w-3" }: AnimatedCheckmarkProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      <motion.path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
        initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={motionTransitionIfMotion(prefersReducedMotion, "micro")}
      />
    </motion.svg>
  )
}
