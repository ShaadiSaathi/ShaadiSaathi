"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import MehndiPattern from "@/components/shaadi-saathi/MehndiPattern"

export interface PortalNavItem {
  href: string
  label: string
  icon: ReactNode
}

interface PortalAppShellProps {
  portalType: "family" | "vendor"
  navItems: readonly PortalNavItem[]
  brandSubtitle: string
  footer?: ReactNode
  children: ReactNode
}

function isActive(pathname: string, href: string, portalType: "family" | "vendor") {
  const dashboard = portalType === "family" ? "/dashboard" : "/vendor/dashboard"
  if (href === dashboard) return pathname === dashboard
  return pathname.startsWith(href)
}

/** Shared sidebar + bottom-nav layout for family and vendor portals */
export default function PortalAppShell({
  portalType,
  navItems,
  brandSubtitle,
  footer,
  children,
}: PortalAppShellProps) {
  const pathname = usePathname()

  return (
    <div className="shaadi-saathi flex min-h-screen bg-ivory">
      <aside className="relative hidden w-64 shrink-0 flex-col border-r border-gold/15 bg-white lg:flex">
        <MehndiPattern opacity={0.03} />
        <div className="relative border-b border-gold/15 px-5 py-5">
          <Link href="/" className="font-display text-lg font-bold text-maroon-dark">
            Shaadi Saathi
          </Link>
          <p className="mt-0.5 text-xs text-maroon/50">{brandSubtitle}</p>
        </div>
        <nav className="relative flex-1 space-y-1 px-3 py-4" aria-label={`${portalType} navigation`}>
          {navItems.map((item) => {
            const active = isActive(pathname, item.href, portalType)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-maroon text-ivory shadow-sm shadow-maroon/20"
                    : "text-maroon/70 hover:bg-maroon/5 hover:text-maroon"
                }`}
              >
                <span className={active ? "text-gold" : "text-gold-dark/70"}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        {footer && <div className="relative border-t border-gold/15 p-4">{footer}</div>}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-gold/20 bg-white/95 backdrop-blur-md lg:hidden"
          aria-label={`${portalType} mobile navigation`}
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <ul className="flex items-stretch justify-around px-1 py-1">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href, portalType)
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium ${
                      active ? "text-maroon" : "text-maroon/50"
                    }`}
                  >
                    <span
                      className={`rounded-lg p-1.5 ${active ? "bg-maroon text-gold" : "text-gold-dark/70"}`}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
