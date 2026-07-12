"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import { useMessages } from "@/components/shaadi-saathi/messages/MessagesContext"
import { isFirebaseConfigured } from "@/lib/firebase/config"
import {
  markMessagesReadForRole,
  sendMessage,
  subscribeMessages,
  subscribeTyping,
  setTyping,
  type ChatMessage,
} from "@/lib/firebase/messages"

interface BookingChatProps {
  bookingId: string
  backHref: string
  backLabel: string
  senderId: string
  senderType: "family" | "vendor"
  otherPartyLabel: string
  title: string
  subtitle?: string
}

export default function BookingChat({
  bookingId,
  backHref,
  backLabel,
  senderId,
  senderType,
  otherPartyLabel,
  title,
  subtitle,
}: BookingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { refreshUnread } = useMessages()

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    const unsub = subscribeMessages(bookingId, setMessages)
    return unsub
  }, [bookingId])

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    const unsub = subscribeTyping(bookingId, (state) => {
      if (!state) {
        setOtherTyping(false)
        return
      }
      setOtherTyping(senderType === "family" ? !!state.vendorTyping : !!state.familyTyping)
    })
    return unsub
  }, [bookingId, senderType])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!isFirebaseConfigured()) return
    void markMessagesReadForRole(bookingId, senderType)
    refreshUnread()
  }, [bookingId, senderType, messages.length, refreshUnread])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await sendMessage({ bookingId, senderId, senderType, text: trimmed })
      setText("")
      void setTyping(bookingId, senderType, false)
    } finally {
      setSending(false)
    }
  }

  function handleInputChange(value: string) {
    setText(value)
    if (isFirebaseConfigured() && value.trim()) {
      void setTyping(bookingId, senderType, true)
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <PageTransition>
        <Link href={backHref} className="mb-4 inline-flex text-sm font-medium text-maroon/60 hover:text-maroon">
          ← {backLabel}
        </Link>
        <p className="text-maroon/70">
          Messaging requires Firebase. Add your <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code> keys to{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      </PageTransition>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col sm:min-h-[70vh]">
      <PageTransition>
      <Link
        href={backHref}
        className="mb-3 inline-flex shrink-0 items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
      >
        ← {backLabel}
      </Link>

      <header className="mb-4 shrink-0">
        <h1 className="font-display text-xl font-bold text-maroon-dark sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-maroon/60">{subtitle}</p>}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gold/25 bg-white shadow-sm">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 pb-2">
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-maroon/40">
              No messages yet. Say hello to {otherPartyLabel.toLowerCase()}!
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.senderType === senderType
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%] ${
                    isMine
                      ? "rounded-br-md bg-maroon text-ivory"
                      : "rounded-bl-md bg-gold/15 text-maroon-dark"
                  }`}
                >
                  <p>{msg.text}</p>
                  <time className="mt-1 block text-[10px] opacity-60">
                    {new Date(msg.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              </div>
            )
          })}
          {otherTyping && (
            <p className="text-xs italic text-maroon/40">
              {otherPartyLabel} is typing…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="sticky bottom-0 flex shrink-0 gap-2 border-t border-gold/15 bg-ivory/80 p-3 backdrop-blur-sm"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <input
            id="chat-input"
            type="text"
            value={text}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={`Message ${otherPartyLabel.toLowerCase()}…`}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-gold/25 bg-white px-4 py-2.5 text-sm text-maroon-dark placeholder:text-maroon/35 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-maroon/10"
            autoComplete="off"
          />
          <GoldButton type="submit" disabled={!text.trim() || sending} className="min-h-11 shrink-0 px-5">
            Send
          </GoldButton>
        </form>
      </div>
      </PageTransition>
    </div>
  )
}
