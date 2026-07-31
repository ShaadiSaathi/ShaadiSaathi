import type { ReactNode } from "react"

export function AdminPageHeader({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
      ) : null}
    </div>
  )
}

export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-zinc-200 bg-white ${className}`}
    >
      {children}
    </div>
  )
}

export function AdminStatCard({ label, value }: { label: string; value: number }) {
  return (
    <AdminCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
        {value.toLocaleString()}
      </p>
    </AdminCard>
  )
}

export function AdminAlert({
  children,
  variant = "error",
}: {
  children: ReactNode
  variant?: "error" | "info"
}) {
  const styles =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-blue-200 bg-blue-50 text-blue-800"
  return (
    <p className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  )
}

export function AdminTable({
  headers,
  rows,
  emptyMessage = "No data.",
}: {
  headers: string[]
  rows: ReactNode[][]
  emptyMessage?: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-zinc-100 last:border-0"
            >
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2.5 text-zinc-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger"
}) {
  const base =
    "inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition disabled:opacity-50"
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : variant === "danger"
        ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
        : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"

  return (
    <button
      className={`${base} ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function AdminInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 ${className}`}
      {...props}
    />
  )
}

export function AdminMuted({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-500">{children}</p>
}
