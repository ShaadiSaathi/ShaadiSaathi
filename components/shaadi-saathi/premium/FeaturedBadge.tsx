/** Gold badge for Featured vendor subscription tier */
export default function FeaturedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-maroon-dark ${className}`}
    >
      Featured
    </span>
  )
}
