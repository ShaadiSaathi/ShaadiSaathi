"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { useAuth } from "@/components/shaadi-saathi/auth/AuthContext"
import { getFirebaseAuth } from "@/lib/firebase/config"
import { fetchAdminMe } from "@/lib/admin/client"

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/automation", label: "Automation" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/users", label: "Users" },
] as const

function AdminNavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-zinc-900 text-white"
          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      }`}
    >
      {children}
    </Link>
  )
}

export default function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { firebaseUser, authLoading, isFirebaseMode } = useAuth()
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!isFirebaseMode || !firebaseUser) {
      router.replace("/")
      return
    }

    let cancelled = false

    async function verifyAdmin() {
      try {
        let result = await fetchAdminMe()
        if (!result.ok) {
          await getFirebaseAuth().currentUser?.getIdToken(true)
          result = await fetchAdminMe()
        }
        if (cancelled) return
        if (!result.ok) {
          router.replace("/")
          return
        }
        setAllowed(true)
      } catch {
        if (!cancelled) router.replace("/")
      } finally {
        if (!cancelled) setChecking(false)
      }
    }

    void verifyAdmin()
    return () => {
      cancelled = true
    }
  }, [authLoading, firebaseUser, isFirebaseMode, router])

  if (authLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Loading…
      </div>
    )
  }

  if (!allowed) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              Internal tool
            </p>
            <h1 className="text-base font-semibold text-zinc-900">
              Shaadi Saathi Admin
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <AdminNavLink key={item.href} href={item.href}>
                {item.label}
              </AdminNavLink>
            ))}
            <Link
              href="/dashboard"
              className="ml-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800"
            >
              Exit
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}
