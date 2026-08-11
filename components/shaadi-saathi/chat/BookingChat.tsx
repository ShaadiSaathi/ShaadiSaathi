"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import GoldButton from "@/components/shaadi-saathi/app/GoldButton"
import PageTransition from "@/components/shaadi-saathi/app/PageTransition"
import { useMessages } from "@/components/shaadi-saathi/messages/MessagesContext"
import {
  isFirebaseConfigured,
  isFirebaseStorageConfigured,
} from "@/lib/firebase/config"
import {
  CHAT_IMAGE_ACCEPT,
  uploadChatImage,
} from "@/lib/firebase/chat-upload"
import {
  markMessagesReadForRole,
  sendMessage,
  subscribeMessages,
  subscribeThreadMessages,
  subscribeTyping,
  setTyping,
  type ChatMessage,
} from "@/lib/firebase/messages"

interface BookingChatProps {
  bookingId?: string
  threadId?: string
  backHref: string
  backLabel: string
  senderId: string
  senderType: "family" | "vendor"
  senderName?: string
  otherPartyLabel: string
  title: string
  subtitle?: string
  /** When false, skip booking last-read updates (thread chats). */
  markBookingRead?: boolean
}

export default function BookingChat({
  bookingId,
  threadId,
  backHref,
  backLabel,
  senderId,
  senderType,
  senderName,
  otherPartyLabel,
  title,
  subtitle,
  markBookingRead = true,
}: BookingChatProps) {
  const scopeId = bookingId ?? threadId
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [otherTyping, setOtherTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { refreshUnread } = useMessages()

  useEffect(() => {
    if (!isFirebaseConfigured() || !scopeId) return
    const unsub = bookingId
      ? subscribeMessages(bookingId, setMessages)
      : subscribeThreadMessages(threadId!, setMessages)
    return unsub
  }, [bookingId, threadId, scopeId])

  useEffect(() => {
    if (!isFirebaseConfigured() || !scopeId) return
    const unsub = subscribeTyping(scopeId, (state) => {
      if (!state) {
        setOtherTyping(false)
        return
      }
      setOtherTyping(senderType === "family" ? !!state.vendorTyping : !!state.familyTyping)
    })
    return unsub
  }, [scopeId, senderType])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!isFirebaseConfigured() || !bookingId || !markBookingRead) return
    void markMessagesReadForRole(bookingId, senderType)
    refreshUnread()
  }, [bookingId, senderType, messages.length, refreshUnread, markBookingRead])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending || !scopeId) return
    setSending(true)
    setUploadError(null)
    try {
      await sendMessage({
        bookingId,
        threadId,
        senderId,
        senderType,
        senderName,
        text: trimmed,
      })
      setText("")
      void setTyping(scopeId, senderType, false, { bookingId, threadId })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn’t send message")
    } finally {
      setSending(false)
    }
  }

  async function handleImageSelected(file: File | undefined) {
    if (!file || sending || !scopeId) return
    setSending(true)
    setUploadError(null)
    try {
      const imageUrl = await uploadChatImage({
        scopeId,
        uid: senderId,
        file,
      })
      await sendMessage({
        bookingId,
        threadId,
        senderId,
        senderType,
        senderName,
        imageUrl,
        text: text.trim() || undefined,
      })
      setText("")
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn’t upload image")
    } finally {
      setSending(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function handleInputChange(value: string) {
    setText(value)
    if (isFirebaseConfigured() && scopeId && value.trim()) {
      void setTyping(scopeId, senderType, true, { bookingId, threadId })
    }
  }

  if (!isFirebaseConfigured()) {
    return (
      <PageTransition>
        <Link href={backHref} className="mb-4 inline-flex min-h-[44px] items-center text-sm font-medium text-maroon/60 hover:text-maroon">
          ← {backLabel}
        </Link>
        <p className="text-maroon/70">
          Messaging requires Firebase. Add your <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code> keys to{" "}
          <code className="text-xs">.env.local</code>.
        </p>
      </PageTransition>
    )
  }

  if (!scopeId) {
    return <p className="text-maroon/60">Chat channel not found.</p>
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col sm:min-h-[70vh]">
      <PageTransition>
      <Link
        href={backHref}
        className="mb-3 inline-flex min-h-[44px] shrink-0 items-center gap-1 text-sm font-medium text-maroon/60 hover:text-maroon"
      >
        ← {backLabel}
      </Link>

      <header className="mb-4 shrink-0">
        <h1 className="font-display text-2xl font-bold text-maroon-dark sm:text-3xl">{title}</h1>
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
            const isMine = msg.senderId === senderId
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
                  {!isMine && msg.senderName ? (
                    <p className="mb-1 text-[11px] font-semibold opacity-70">{msg.senderName}</p>
                  ) : null}
                  {msg.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.imageUrl}
                      alt="Shared photo"
                      className="mb-2 max-h-56 w-full rounded-xl object-cover"
                    />
                  ) : null}
                  {msg.text && msg.text !== "📷 Photo" ? <p>{msg.text}</p> : null}
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

        {uploadError ? (
          <p className="px-3 pb-1 text-xs text-red-700" role="alert">
            {uploadError}
          </p>
        ) : null}

        <form
          onSubmit={handleSend}
          className="sticky bottom-0 flex shrink-0 gap-2 border-t border-gold/15 bg-ivory/80 p-3 backdrop-blur-sm"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={CHAT_IMAGE_ACCEPT}
            className="sr-only"
            aria-label="Attach image"
            onChange={(e) => void handleImageSelected(e.target.files?.[0])}
          />
          {isFirebaseStorageConfigured() ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-white text-maroon/70 transition-colors hover:bg-gold/10 disabled:opacity-50"
              aria-label="Attach image"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
              </svg>
            </button>
          ) : null}
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
