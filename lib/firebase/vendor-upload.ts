/**
 * Vendor portfolio / cover uploads — same Storage + compress pattern as chat images.
 * Path: vendors/{vendorId}/{uid}/{timestamp}.ext
 */

import { getDownloadURL, ref, uploadBytes } from "firebase/storage"
import {
  CHAT_IMAGE_ACCEPT,
  CHAT_IMAGE_MAX_BYTES,
  compressChatImage,
} from "./chat-upload"
import { getFirebaseStorage, isFirebaseStorageConfigured } from "./config"

export const VENDOR_IMAGE_ACCEPT = CHAT_IMAGE_ACCEPT
export const VENDOR_IMAGE_MAX_BYTES = CHAT_IMAGE_MAX_BYTES
export { VENDOR_PORTFOLIO_MAX_IMAGES } from "./vendor-portfolio"

function assertImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed")
  }
  if (file.size > VENDOR_IMAGE_MAX_BYTES) {
    throw new Error("Image must be 5MB or smaller")
  }
}

export async function uploadVendorPortfolioImage(input: {
  vendorId: string
  uid: string
  file: File
}): Promise<string> {
  if (!isFirebaseStorageConfigured()) {
    throw new Error("Image uploads require Firebase Storage configuration")
  }
  assertImageFile(input.file)
  const compressed = await compressChatImage(input.file)
  const ext = compressed.type === "image/png" ? "png" : "jpg"
  const path = `vendors/${input.vendorId}/${input.uid}/${Date.now()}.${ext}`
  const storageRef = ref(getFirebaseStorage(), path)
  await uploadBytes(storageRef, compressed, {
    contentType: compressed.type || "image/jpeg",
    cacheControl: "public,max-age=31536000",
  })
  return getDownloadURL(storageRef)
}
