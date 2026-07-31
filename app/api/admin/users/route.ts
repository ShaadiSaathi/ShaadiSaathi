export const runtime = "nodejs"

import { normalizeE164 } from "@/lib/auth/otp-types"
import type { FirestoreBooking, FirestoreUser, FirestoreWedding } from "@/lib/firebase/types"
import {
  adminErrorResponse,
  verifyAdminRequest,
} from "@/lib/server/admin-auth"
import { getAdminAuth, getAdminDb } from "@/lib/server/firebase-admin"

function normalizeStoredPhone(value: unknown): string | null {
  if (typeof value !== "string") return null
  return normalizeE164(value.trim()) ?? normalizeE164(value.replace(/\s/g, ""))
}

export async function GET(request: Request) {
  try {
    await verifyAdminRequest(request)

    const phoneParam = new URL(request.url).searchParams.get("phone")
    const phone = normalizeE164(phoneParam)
    if (!phone) {
      return Response.json(
        { ok: false, message: "Enter a valid phone in E.164 format (e.g. +923001234567)" },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    let uid: string | null = null
    let profile: FirestoreUser | null = null

    try {
      const authUser = await auth.getUserByPhoneNumber(phone)
      uid = authUser.uid
    } catch {
      // No Auth account for this number — fall back to Firestore lookup.
    }

    const usersSnap = await db.collection("users").where("phone", "==", phone).limit(5).get()
    if (!usersSnap.empty) {
      const doc = usersSnap.docs[0]!
      uid = doc.id
      profile = { uid: doc.id, ...doc.data() } as FirestoreUser
    } else if (uid) {
      const snap = await db.collection("users").doc(uid).get()
      if (snap.exists) {
        profile = { uid, ...snap.data() } as FirestoreUser
      }
    }

    let wedding: FirestoreWedding | null = null

    if (profile?.weddingId) {
      const snap = await db.collection("weddings").doc(profile.weddingId).get()
      if (snap.exists) {
        wedding = { id: snap.id, ...snap.data() } as FirestoreWedding
      }
    }

    if (!wedding) {
      const byPhoneSnap = await db
        .collection("weddings")
        .where("organiserPhone", "==", phone)
        .limit(1)
        .get()
      if (!byPhoneSnap.empty) {
        const doc = byPhoneSnap.docs[0]!
        wedding = { id: doc.id, ...doc.data() } as FirestoreWedding
        uid = uid ?? wedding.ownerId
      }
    }

    if (!wedding && !profile && !uid) {
      const allWeddings = await db.collection("weddings").get()
      for (const doc of allWeddings.docs) {
        const data = doc.data()
        const organiserPhone = normalizeStoredPhone(data.organiserPhone)
        if (organiserPhone === phone) {
          wedding = { id: doc.id, ...data } as FirestoreWedding
          uid = uid ?? wedding.ownerId
          break
        }
      }
    }

    if (!profile && !wedding && !uid) {
      return Response.json(
        { ok: false, message: "No user or wedding found for that phone number" },
        { status: 404 }
      )
    }

    if (!profile && uid) {
      const snap = await db.collection("users").doc(uid).get()
      if (snap.exists) {
        profile = { uid, ...snap.data() } as FirestoreUser
      }
    }

    const weddingId = profile?.weddingId ?? wedding?.id ?? null
    const vendorId = profile?.vendorId ?? null

    let guestCount = 0
    let taskCount = 0
    let bookings: Array<{
      id: string
      vendorName: string
      status: string
      price: number
      eventId: string
      createdAt: number
    }> = []

    if (weddingId) {
      const [guestsSnap, tasksSnap, bookingsSnap] = await Promise.all([
        db.collection("guests").where("weddingId", "==", weddingId).get(),
        db.collection("tasks").where("weddingId", "==", weddingId).get(),
        db.collection("bookings").where("weddingId", "==", weddingId).get(),
      ])
      guestCount = guestsSnap.size
      taskCount = tasksSnap.size
      bookings = bookingsSnap.docs
        .map((doc) => {
          const data = doc.data() as FirestoreBooking
          return {
            id: doc.id,
            vendorName: String(data.vendorName ?? ""),
            status: String(data.status ?? ""),
            price: Number(data.price ?? 0),
            eventId: String(data.eventId ?? ""),
            createdAt: Number(data.createdAt ?? 0),
          }
        })
        .sort((a, b) => b.createdAt - a.createdAt)
    } else if (vendorId) {
      const bookingsSnap = await db
        .collection("bookings")
        .where("vendorId", "==", vendorId)
        .get()
      bookings = bookingsSnap.docs
        .map((doc) => {
          const data = doc.data() as FirestoreBooking
          return {
            id: doc.id,
            vendorName: String(data.vendorName ?? ""),
            status: String(data.status ?? ""),
            price: Number(data.price ?? 0),
            eventId: String(data.eventId ?? ""),
            createdAt: Number(data.createdAt ?? 0),
          }
        })
        .sort((a, b) => b.createdAt - a.createdAt)
    }

    return Response.json(
      {
        ok: true,
        queryPhone: phone,
        user: profile
          ? {
              uid: profile.uid,
              role: profile.role,
              name: profile.name,
              phone: profile.phone,
              weddingId: profile.weddingId ?? null,
              vendorId: profile.vendorId ?? null,
              createdAt: profile.createdAt,
            }
          : null,
        authUid: uid,
        wedding: wedding
          ? {
              id: wedding.id,
              name: wedding.name,
              couple: wedding.couple,
              shareCode: wedding.shareCode,
              organiserName: wedding.organiserName,
              organiserPhone: wedding.organiserPhone,
              firstEventDate: wedding.firstEventDate,
              isPremium: wedding.isPremium,
              ownerId: wedding.ownerId,
              memberCount: wedding.memberUids?.length ?? 0,
              createdAt: wedding.createdAt,
            }
          : null,
        counts: {
          guests: guestCount,
          tasks: taskCount,
          bookings: bookings.length,
        },
        bookings,
      },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    return adminErrorResponse(err)
  }
}
