import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import { getFirebaseStorage, isFirebaseStorageConfigured } from "./config"

export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const CHAT_IMAGE_MAX_DIMENSION = 1280
export const CHAT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif"

function assertImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed")
  }
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 5MB or smaller")
  }
}

/** Resize/compress large images in the browser before upload. */
export async function compressChatImage(file: File): Promise<Blob> {
  assertImageFile(file)
  if (typeof window === "undefined" || typeof createImageBitmap === "undefined") {
    return file
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(
    1,
    CHAT_IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height)
  )
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return file
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.72)
  )
  if (!blob || blob.size >= file.size) return file
  return blob
}

export async function uploadChatImage(input: {
  scopeId: string
  uid: string
  file: File
}): Promise<string> {
  if (!isFirebaseStorageConfigured()) {
    throw new Error("Image uploads require Firebase Storage configuration")
  }
  assertImageFile(input.file)
  const compressed = await compressChatImage(input.file)
  const ext = compressed.type === "image/png" ? "png" : "jpg"
  const path = `chat/${input.scopeId}/${input.uid}/${Date.now()}.${ext}`
  const storageRef = ref(getFirebaseStorage(), path)
  await uploadBytes(storageRef, compressed, {
    contentType: compressed.type || "image/jpeg",
    cacheControl: "public,max-age=31536000",
  })
  return getDownloadURL(storageRef)
}
