"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import SidebarNavItem from "@/components/shaadi-saathi/app/SidebarNavItem"
import SidebarUpgradeCTA from "@/components/shaadi-saathi/app/SidebarUpgradeCTA"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useMessages } from "@/components/shaadi-saathi/messages/MessagesContext"
import { CURRENT_VENDOR } from "@/lib/mockVendorPortal"

const NAV_ITEMS = [
  {
    href: "/vendor/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    href: "/vendor/requests",
    label: "Requests",
    shortLabel: "Requests",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
      </svg>
    ),
  },
  {
    href: "/vendor/jobs",
    label: "My Jobs",
    shortLabel: "Jobs",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
  },
  {
    href: "/vendor/earnings",
    label: "Earnings",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.375M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    href: "/vendor/profile",
    label: "Profile",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.577-1.22a2.25 2.25 0 00-2.134 0z" />
      </svg>
    ),
  },
] as const

const FEATURED_NAV_ITEM = {
  href: "/vendor/profile#featured-settings",
  label: "Featured Settings",
  shortLabel: "Featured",
  feature: "visibility",
  lockedMessage: "Boosted visibility and multi-category listing are Featured benefits — upgrade to unlock",
  icon: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
}

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0]
  if (path === "/vendor/dashboard") return pathname === "/vendor/dashboard"
  return pathname.startsWith(path)
}

export function VendorSidebar() {
  const pathname = usePathname()
  const { vendorTier } = usePremium()
  const { vendorUnreadCount } = useMessages()
  const isFeatured = vendorTier === "featured"

  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-gold/15 bg-white lg:flex">
      <MehndiPattern opacity={0.03} />
      <div className="relative border-b border-gold/15 px-5 py-5">
        <Link href="/" className="font-display text-lg font-bold text-maroon-dark">
          Shaadi Saathi
        </Link>
        <p className="mt-0.5 text-xs text-maroon/50">Vendor portal</p>
      </div>
      <nav className="relative flex-1 space-y-1 px-3 py-4" aria-label="Vendor navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-maroon text-ivory shadow-sm shadow-maroon/20"
                  : "text-maroon/70 hover:bg-maroon/5 hover:text-maroon"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className={`relative ${active ? "text-gold" : "text-gold-dark/70"}`}>
                {item.icon}
                {item.href === "/vendor/jobs" && vendorUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                )}
              </span>
              {item.label}
            </Link>
          )
        })}

        <div className="my-3 border-t border-gold/10 pt-3" aria-hidden="true" />

        <SidebarNavItem
          href={FEATURED_NAV_ITEM.href}
          label={FEATURED_NAV_ITEM.label}
          icon={FEATURED_NAV_ITEM.icon}
          active={isActive(pathname, FEATURED_NAV_ITEM.href)}
          locked={!isFeatured}
          upgradeHref={`/vendor/upgrade?feature=${FEATURED_NAV_ITEM.feature}`}
          lockedAriaLabel={`${FEATURED_NAV_ITEM.label}: Featured subscription required. ${FEATURED_NAV_ITEM.lockedMessage}`}
          premiumChipLabel="Featured"
          variant="sidebar"
        />

        <div className="mt-4 border-t border-gold/10 pt-4">
          <SidebarUpgradeCTA portal="vendor" isUpgraded={isFeatured} />
        </div>
      </nav>
      <div className="relative border-t border-gold/15 p-4">
        <div className="flex items-center gap-3 rounded-xl bg-ivory px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-xs font-semibold text-gold">
            LF
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-maroon-dark">{CURRENT_VENDOR.name}</p>
            <p className="text-xs text-maroon/50">{CURRENT_VENDOR.categoryLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function VendorBottomNav() {
  const pathname = usePathname()
  const { vendorTier } = usePremium()
  const { vendorUnreadCount } = useMessages()
  const isFeatured = vendorTier === "featured"

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <SidebarUpgradeCTA portal="vendor" isUpgraded={isFeatured} compact />
      <nav
        className="border-t border-gold/20 bg-white/95 backdrop-blur-md"
        aria-label="Vendor mobile navigation"
      >
        <ul className="flex items-stretch gap-0.5 overflow-x-auto px-1 py-1 scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href} className="min-w-[3.5rem] shrink-0 flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium ${
                    active ? "text-maroon" : "text-maroon/50"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={`relative rounded-lg p-1.5 ${active ? "bg-maroon text-gold" : "text-gold-dark/70"}`}>
                    {item.icon}
                    {item.href === "/vendor/jobs" && vendorUnreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-bold text-white">
                        {vendorUnreadCount > 9 ? "9+" : vendorUnreadCount}
                      </span>
                    )}
                  </span>
                  {"shortLabel" in item ? item.shortLabel : item.label}
                </Link>
              </li>
            )
          })}
          <SidebarNavItem
            href={FEATURED_NAV_ITEM.href}
            label={FEATURED_NAV_ITEM.label}
            shortLabel={FEATURED_NAV_ITEM.shortLabel}
            icon={FEATURED_NAV_ITEM.icon}
            active={isActive(pathname, FEATURED_NAV_ITEM.href)}
            locked={!isFeatured}
            upgradeHref={`/vendor/upgrade?feature=${FEATURED_NAV_ITEM.feature}`}
            lockedAriaLabel={`${FEATURED_NAV_ITEM.label}: Featured subscription required. ${FEATURED_NAV_ITEM.lockedMessage}`}
            premiumChipLabel="Featured"
            variant="bottom"
          />
        </ul>
      </nav>
    </div>
  )
}
