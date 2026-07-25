"use client"

interface ModalSheetProps {
  children: React.ReactNode
  onClose?: () => void
  titleId?: string
  labelledBy?: string
  className?: string
}

/** Full-screen sheet on mobile (<768px), centered modal on desktop */
export default function ModalSheet({
  children,
  onClose,
  titleId,
  labelledBy,
  className = "",
}: ModalSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-maroon-dark/40 md:items-center md:p-4"
      role="dialog"
      aria-labelledby={labelledBy ?? titleId}
      aria-modal="true"
      onClick={onClose ? () => onClose() : undefined}
    >
      <div
        className={`safe-bottom flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gold/25 bg-ivory shadow-xl md:max-h-[90vh] md:max-w-lg md:rounded-2xl md:pb-0 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-2.5 pb-1 md:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-maroon/15" />
        </div>
        {children}
      </div>
    </div>
  )
}
