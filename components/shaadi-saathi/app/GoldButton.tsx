"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

interface GoldButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  variant?: "primary" | "ghost"
  className?: string
  disabled?: boolean
}

/** App-level CTA — smaller than landing page button */
export default function GoldButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
}: GoldButtonProps) {
  const prefersReducedMotion = useReducedMotion()

  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    primary: "bg-gold text-maroon-dark shadow-sm shadow-gold/20 hover:shadow-md hover:shadow-gold/30",
    ghost: "border border-maroon/20 text-maroon hover:bg-maroon/5",
  }

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: disabled ? undefined : { scale: 1.02 },
        whileTap: disabled ? undefined : { scale: 0.98 },
      }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...motionProps}
    >
      {children}
    </motion.button>
  )
}
