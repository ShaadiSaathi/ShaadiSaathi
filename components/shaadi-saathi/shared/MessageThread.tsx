import type { BookingMessage } from "@/lib/mockPayments"

interface MessageThreadProps {
  messages: BookingMessage[]
  title?: string
}

/** Persistent in-app message history on job/booking detail */
export default function MessageThread({
  messages,
  title = "Message history",
}: MessageThreadProps) {
  if (messages.length === 0) return null

  return (
    <section className="rounded-2xl border border-gold/25 bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold text-maroon-dark">{title}</h2>
      <p className="mt-1 text-xs text-maroon/50">
        Kept on record in Shaadi Saathi — even after the job is done
      </p>
      <ul className="mt-4 space-y-3">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`rounded-xl px-3 py-2 text-sm ${
              msg.sender === "family"
                ? "ml-0 mr-8 bg-ivory text-maroon-dark"
                : "ml-8 mr-0 bg-maroon/5 text-maroon-dark"
            }`}
          >
            <p className="text-xs font-semibold text-maroon/50 capitalize">
              {msg.sender === "family" ? "Family" : "Vendor"}
            </p>
            <p className="mt-0.5 leading-relaxed">{msg.text}</p>
            <time className="mt-1 block text-[10px] text-maroon/40">
              {new Date(msg.sentAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
          </li>
        ))}
      </ul>
    </section>
  )
}
