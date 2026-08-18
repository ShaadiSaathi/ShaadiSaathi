"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import type { ReactNode } from "react"
import { cn } from "@/lib/design/cn"
import { motionTransitionIfMotion } from "@/lib/design/motion-tokens"

export type ButtonVariant = "primary" | "secondary" | "ghost"

export interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  type?: "button" | "submit"
  variant?: ButtonVariant
  className?: string
  disabled?: boolean
  href?: string
  "aria-label"?: string
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-[box-shadow,background-color,border-color,color] duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon disabled:opacity-50 disabled:pointer-events-none"

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-gold text-maroon-dark shadow-sm shadow-gold/20 hover:shadow-md hover:shadow-gold/30",
  secondary: "bg-maroon text-ivory shadow-sm hover:bg-maroon-dark",
  ghost: "border border-maroon/20 text-maroon hover:bg-maroon/5",
}

/** Family-app CTA primitive — gold primary, maroon secondary, outline ghost. */
export default function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled = false,
  href,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const prefersReducedMotion = useReducedMotion()
  const classes = cn(BASE, VARIANTS[variant], className)

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: disabled ? undefined : { scale: 1.015 },
        whileTap: disabled ? undefined : { scale: 0.97 },
        transition: motionTransitionIfMotion(false, "micro"),
      }

  if (href && !disabled) {
    const stretch = className.includes("w-full")
    return (
      <motion.span className={cn("inline-flex", stretch && "w-full")} {...motionProps}>
        <Link href={href} className={classes} onClick={onClick} aria-label={ariaLabel}>
          {children}
        </Link>
      </motion.span>
    )
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      aria-label={ariaLabel}
      {...motionProps}
    >
      {children}
    </motion.button>
  )
}
