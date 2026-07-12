"use client"

import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"

interface CTAButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary"
  className?: string
}

export default function CTAButton({
  children,
  href = "#",
  onClick,
  variant = "primary",
  className = "",
}: CTAButtonProps) {
  const prefersReducedMotion = useReducedMotion()

  const base =
    "inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"

  const variants = {
    primary:
      "bg-gold text-maroon-dark shadow-md shadow-gold/25 hover:shadow-lg hover:shadow-gold/35",
    secondary:
      "border-2 border-maroon/30 bg-transparent text-maroon hover:border-maroon/50 hover:bg-maroon/5",
  }

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.03 },
        whileTap: { scale: 0.98 },
        transition: { type: "spring" as const, stiffness: 400, damping: 20 },
      }

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className={`${base} ${variants[variant]} ${className}`}
        {...motionProps}
      >
        {children}
      </motion.button>
    )
  }

  return (
    <motion.a
      href={href}
      className={`${base} ${variants[variant]} ${className}`}
      {...motionProps}
    >
      {children}
    </motion.a>
  )
}
