import { useState } from "react"
import { StyleSheet, Text } from "react-native"
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  ErrorText,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import { exportWeddingPlanPdf } from "@/src/lib/premium-api"
import { colors, spacing } from "@/src/lib/theme"

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export default function ExportPdfScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { wedding } = useWedding()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [path, setPath] = useState<string | null>(null)

  async function exportPdf() {
    setBusy(true)
    setError(null)
    try {
      const buf = await exportWeddingPlanPdf()
      const base64 = bytesToBase64(buf)
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory
      if (!dir) throw new Error("No file directory available")
      const file = `${dir}wedding-plan-${Date.now()}.pdf`
      await FileSystem.writeAsStringAsync(file, base64, {
        encoding: FileSystem.EncodingType.Base64,
      })
      setPath(file)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file, {
          mimeType: "application/pdf",
          dialogTitle: "Wedding plan PDF",
          UTI: "com.adobe.pdf",
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed"
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  const premium = Boolean(wedding?.isPremium)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="Export your wedding plan as PDF" />
      {!premium ? (
        <Card>
          <Text style={styles.lock}>
            PDF export is included with Family Premium.
          </Text>
          <PrimaryButton
            label="View Premium"
            onPress={() => router.push("/(family)/upgrade")}
          />
        </Card>
      ) : (
        <>
          <ErrorText message={error} />
          <PrimaryButton
            label="Generate & share PDF"
            loading={busy}
            onPress={() => void exportPdf()}
          />
          {path ? (
            <Text style={styles.meta}>Saved: {path.split("/").pop()}</Text>
          ) : null}
        </>
      )}
      <SecondaryButton label="Back" onPress={() => router.back()} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  lock: {
    fontFamily: "DMSans_400Regular",
    color: colors.ink,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  meta: {
    marginTop: spacing.md,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
  },
})
