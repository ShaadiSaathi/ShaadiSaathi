import CategoryIcon from "./CategoryIcon"
import { VENDOR_CATEGORIES, type VendorCategory, type VendorCategoryId } from "@/lib/mockVendors"

interface CategoryGridProps {
  selected: VendorCategoryId | "all"
  onSelect: (id: VendorCategoryId | "all") => void
  categories?: VendorCategory[]
}

export default function CategoryGrid({
  selected,
  onSelect,
  categories = VENDOR_CATEGORIES,
}: CategoryGridProps) {
  return (
    <div
      className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 scrollbar-none md:mx-0 md:flex-wrap md:snap-none md:overflow-visible md:px-0 md:scrollbar-auto"
      role="tablist"
      aria-label="Vendor categories"
    >
      <button
        type="button"
        role="tab"
        aria-selected={selected === "all"}
        onClick={() => onSelect("all")}
        className={`flex min-h-[44px] w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 transition-colors md:w-auto md:px-4 ${
          selected === "all"
            ? "border-maroon bg-maroon text-ivory"
            : "border-gold/20 bg-white text-maroon/70 hover:border-gold/40"
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        <span className="text-[11px] font-medium">All</span>
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          role="tab"
          aria-selected={selected === cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex min-h-[44px] w-[4.5rem] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 transition-colors md:w-auto md:px-3 ${
            selected === cat.id
              ? "border-maroon bg-maroon text-ivory"
              : "border-gold/20 bg-white text-maroon/70 hover:border-gold/40"
          }`}
        >
          <CategoryIcon
            categoryId={cat.id}
            className={`h-5 w-5 ${selected === cat.id ? "text-gold" : "text-gold-dark/70"}`}
          />
          <span className="max-w-[4rem] truncate text-[10px] font-medium md:max-w-[72px]">
            {cat.shortLabel}
          </span>
        </button>
      ))}
    </div>
  )
}
