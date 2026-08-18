"use client"

import type { ReactNode } from "react"
import ModalSheet from "@/components/shaadi-saathi/shared/ModalSheet"
import { cn } from "@/lib/design/cn"

export interface ModalProps {
  children?: ReactNode
  onClose: () => void
  title?: string
  titleId?: string
  description?: string
  descriptionId?: string
  footer?: ReactNode
  role?: "dialog" | "alertdialog"
  size?: "sm" | "md" | "lg"
  className?: string
  bodyClassName?: string
}

const SIZE_CLASS = {
  sm: "md:max-w-sm",
  md: "md:max-w-md",
  lg: "md:max-w-lg",
} as const

/** Bottom sheet on mobile, centered dialog on desktop — shared overlay. */
export default function Modal({
  children,
  onClose,
  title,
  titleId = "modal-title",
  description,
  descriptionId = "modal-desc",
  footer,
  role = "dialog",
  size = "md",
  className,
  bodyClassName,
}: ModalProps) {
  return (
    <ModalSheet
      onClose={onClose}
      titleId={title ? titleId : undefined}
      describedBy={description ? descriptionId : undefined}
      role={role}
      className={cn(SIZE_CLASS[size], className)}
    >
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-5 md:p-6", bodyClassName)}>
        {title ? (
          <h2 id={titleId} className="shaadi-section-title text-xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-maroon/55">
            {description}
          </p>
        ) : null}
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-gold/15 p-4 md:px-6 md:py-5">{footer}</div>
      ) : null}
    </ModalSheet>
  )
}
