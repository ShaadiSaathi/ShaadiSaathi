/** Simple "or" divider between primary auth and social login */
export default function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-gold/20" aria-hidden="true" />
      <span className="text-xs font-medium uppercase tracking-wider text-maroon/40">or</span>
      <div className="h-px flex-1 bg-gold/20" aria-hidden="true" />
    </div>
  )
}
