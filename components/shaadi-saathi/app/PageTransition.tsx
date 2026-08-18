"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { motionTransitionIfMotion } from "@/lib/design/motion-tokens"

interface PageTransitionProps {
  children: ReactNode
}

/** Subtle page enter — snappy app pacing via shared motion tokens. */
export default function PageTransition({ children }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  if (prefersReducedMotion) {
    return <>{children}</>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransitionIfMotion(false, "standard")}
    >
      {children}
    </motion.div>
  )
}
