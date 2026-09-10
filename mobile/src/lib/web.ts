import * as WebBrowser from "expo-web-browser"
import { getApiBaseUrl } from "@/src/lib/firebase"

/** Open a web-app path in the in-app browser (payments, AI, seating, PDF, etc.). */
export async function openWebPath(path: string) {
  const base = getApiBaseUrl()
  const url = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? path : `/${path}`}`
  await WebBrowser.openBrowserAsync(url)
}
