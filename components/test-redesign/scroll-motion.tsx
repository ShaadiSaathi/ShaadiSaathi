"use client"

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion"
import type { ReactNode } from "react"

/** Shared easing — premium, not bouncy */
export const revealEase = [0.22, 1, 0.36, 1] as const

const viewportOnce = { once: true, margin: "-60px" as const }

export function usePrefersReducedMotion(): boolean {
  return useReducedMotion() ?? false
}

type RevealProps = Omit<HTMLMotionProps<"div">, "initial" | "whileInView" | "viewport"> & {
  children: ReactNode
  delay?: number
}

/** Fade + upward slide when entering the viewport (once). */
export function Reveal({ children, className, delay = 0, ...rest }: RevealProps) {
  const reduced = usePrefersReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{
        duration: 0.55,
        delay,
        ease: revealEase,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

type StaggerContainerProps = {
  children: ReactNode
  className?: string
  stagger?: number
  as?: "div" | "ul" | "ol"
}

export function StaggerContainer({
  children,
  className,
  stagger = 0.08,
  as = "div",
}: StaggerContainerProps) {
  const reduced = usePrefersReducedMotion()

  const variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : stagger,
      },
    },
  }

  if (as === "ul") {
    return (
      <motion.ul
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={variants}
      >
        {children}
      </motion.ul>
    )
  }

  if (as === "ol") {
    return (
      <motion.ol
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={variants}
      >
        {children}
      </motion.ol>
    )
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
    >
      {children}
    </motion.div>
  )
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: revealEase },
  },
}

type StaggerItemProps = {
  children: ReactNode
  className?: string
  as?: "div" | "li" | "article"
}

export function StaggerItem({ children, className, as = "div" }: StaggerItemProps) {
  const reduced = usePrefersReducedMotion()
  const variants = reduced ? undefined : itemVariants

  if (as === "li") {
    return (
      <motion.li className={className} variants={variants}>
        {children}
      </motion.li>
    )
  }

  if (as === "article") {
    return (
      <motion.article className={className} variants={variants}>
        {children}
      </motion.article>
    )
  }

  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  )
}
