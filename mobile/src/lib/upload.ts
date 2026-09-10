import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage"
import { getFirebaseApp } from "@/src/lib/firebase"

export async function uploadVendorImage(input: {
  vendorId: string
  uid: string
  uri: string
  mimeType?: string
}): Promise<string> {
  const res = await fetch(input.uri)
  const blob = await res.blob()
  const ext =
    input.mimeType?.includes("png")
      ? "png"
      : input.mimeType?.includes("webp")
        ? "webp"
        : "jpg"
  const path = `vendors/${input.vendorId}/${input.uid}/${Date.now()}.${ext}`
  const storage = getStorage(getFirebaseApp())
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob, {
    contentType: input.mimeType || "image/jpeg",
  })
  return getDownloadURL(storageRef)
}
