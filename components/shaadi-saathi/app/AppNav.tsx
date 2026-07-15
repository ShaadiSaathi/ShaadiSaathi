"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"
import SidebarNavItem from "@/components/shaadi-saathi/app/SidebarNavItem"
import SidebarUpgradeCTA from "@/components/shaadi-saathi/app/SidebarUpgradeCTA"
import { usePremium } from "@/components/shaadi-saathi/premium/PremiumContext"
import { useMessages } from "@/components/shaadi-saathi/messages/MessagesContext"
import { CURRENT_USER, WEDDING } from "@/lib/mockData"

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
      </svg>
    ),
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: "/guests",
    label: "Guests",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/vendors",
    label: "Vendors",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
] as const

const PREMIUM_NAV_ITEMS = [
  {
    href: "/seating",
    label: "Seating Planner",
    shortLabel: "Seating",
    feature: "seating",
    lockedMessage: "Seating Planner is a Premium feature — upgrade to unlock it",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/settings#invite-themes",
    label: "Invite Themes",
    shortLabel: "Themes",
    feature: "themes",
    lockedMessage: "Custom invite themes are a Premium feature — upgrade to unlock them",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-2.21-1.79-4-4-4s-4 1.79-4 4c0 .66.17 1.28.47 1.822M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
] as const

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0]
  if (path === "/dashboard") return pathname === "/dashboard"
  return pathname.startsWith(path)
}

export function Sidebar() {
  const pathname = usePathname()
  const { isFamilyPremium } = usePremium()
  const { familyUnreadCount } = useMessages()

  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-gold/15 bg-white lg:flex">
      <MehndiPattern opacity={0.03} />

      <div className="relative border-b border-gold/15 px-5 py-5">
        <Link href="/" className="font-display text-lg font-bold text-maroon-dark">
          Shaadi Saathi
        </Link>
        <p className="mt-0.5 truncate text-xs text-maroon/50">{WEDDING.name}</p>
      </div>

      <nav className="relative flex-1 space-y-1 px-3 py-4" aria-label="App navigation">
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
                {item.href === "/vendors" && familyUnreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                )}
              </span>
              {item.label}
              {item.href === "/vendors" && familyUnreadCount > 0 && (
                <span className="sr-only">, {familyUnreadCount} unread messages</span>
              )}
            </Link>
          )
        })}

        <div className="my-3 border-t border-gold/10 pt-3" aria-hidden="true" />

        {PREMIUM_NAV_ITEMS.map((item) => (
          <SidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(pathname, item.href)}
            locked={!isFamilyPremium}
            upgradeHref={`/upgrade?feature=${item.feature}`}
            lockedAriaLabel={`${item.label}: Premium feature, upgrade required. ${item.lockedMessage}`}
            premiumChipLabel="Premium"
            variant="sidebar"
          />
        ))}

        <div className="mt-4 border-t border-gold/10 pt-4">
          <SidebarUpgradeCTA portal="family" isUpgraded={isFamilyPremium} />
        </div>
      </nav>

      <div className="relative border-t border-gold/15 p-4">
        <Link
          href="/settings"
          className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-maroon/10 text-maroon"
              : "text-maroon/60 hover:bg-maroon/5 hover:text-maroon"
          }`}
        >
          <svg className="h-5 w-5 text-gold-dark/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6.75 0 3 3 0 016.75 0zm6 0a3 3 0 11-6.75 0 3 3 0 016.75 0zm-13.5 0a3 3 0 11-6.75 0 3 3 0 016.75 0z" />
          </svg>
          Family & Settings
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-ivory px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-maroon to-maroon-dark text-sm font-semibold text-gold">
            {CURRENT_USER.initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-maroon-dark">{CURRENT_USER.name}</p>
            <p className="text-xs text-maroon/50">Planner</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const { isFamilyPremium } = usePremium()
  const { familyUnreadCount } = useMessages()

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <SidebarUpgradeCTA portal="family" isUpgraded={isFamilyPremium} compact />
      <nav
        className="border-t border-gold/20 bg-white/95 backdrop-blur-md"
        aria-label="Mobile navigation"
      >
        <ul className="flex snap-x items-stretch gap-1 overflow-x-auto px-2 py-1.5 scrollbar-none [scrollbar-width:none]">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href} className="min-w-[4rem] shrink-0 flex-1 snap-start">
                <Link
                  href={item.href}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-1.5 text-[11px] font-medium leading-none transition-colors ${
                    active ? "text-maroon" : "text-maroon/55"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? "bg-maroon text-gold" : "text-gold-dark/70"}`}
                  >
                    {item.icon}
                    {item.href === "/vendors" && familyUnreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-600 px-0.5 text-[8px] font-bold text-white ring-2 ring-white">
                        {familyUnreadCount > 9 ? "9+" : familyUnreadCount}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              </li>
            )
          })}
          {PREMIUM_NAV_ITEMS.map((item) => (
            <SidebarNavItem
              key={item.href}
              href={item.href}
              label={item.label}
              shortLabel={item.shortLabel}
              icon={item.icon}
              active={isActive(pathname, item.href)}
              locked={!isFamilyPremium}
              upgradeHref={`/upgrade?feature=${item.feature}`}
              lockedAriaLabel={`${item.label}: Premium feature, upgrade required. ${item.lockedMessage}`}
              premiumChipLabel="Premium"
              variant="bottom"
            />
          ))}
        </ul>
      </nav>
    </div>
  )
}
