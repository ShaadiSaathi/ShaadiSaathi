import { useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  EmptyState,
  ErrorText,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useWedding } from "@/src/context/WeddingContext"
import { useVendor } from "@/src/hooks/useWeddingData"
import { eventLabel } from "@/src/lib/events"
import { createBooking } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"
import type { EventId, VendorPackage } from "@/src/lib/types"

export default function VendorDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const vendorId = typeof id === "string" ? id : id?.[0] ?? null
  const { profile } = useAuth()
  const { wedding, weddingId } = useWedding()
  const { vendor, loading } = useVendor(vendorId)
  const [bookingPkg, setBookingPkg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function bookPackage(pkg: VendorPackage) {
    if (!weddingId || !vendor || !vendorId) {
      setError("Wedding or vendor missing")
      return
    }
    const eventId: EventId =
      vendor.availableFor?.[0] ?? ("mehndi" as EventId)
    setBookingPkg(pkg.name)
    setError(null)
    try {
      const { bookingId } = await createBooking({
        weddingId,
        vendorId,
        eventId,
        price: pkg.price,
        packageName: pkg.name,
        familyName: profile?.name,
        weddingName: wedding?.name,
        vendorName: vendor.name,
      })
      router.push(`/(family)/booking/${bookingId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create booking")
    } finally {
      setBookingPkg(null)
    }
  }

  if (loading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (!vendor) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Vendor" />
        <EmptyState title="Vendor not found" body="This listing may be unavailable." />
        <SecondaryButton label="Back" onPress={() => router.back()} />
      </Screen>
    )
  }

  const packages = vendor.packages ?? []

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle={vendor.name} />
        <ErrorText message={error} />

        <Card>
          <Text style={styles.meta}>
            {[vendor.category, vendor.city].filter(Boolean).join(" · ") ||
              "Vendor"}
          </Text>
          {vendor.availableFor && vendor.availableFor.length > 0 ? (
            <Text style={styles.meta}>
              Available for{" "}
              {vendor.availableFor.map((e) => eventLabel(e)).join(", ")}
            </Text>
          ) : null}
          {vendor.bio ? <Text style={styles.bio}>{vendor.bio}</Text> : null}
        </Card>

        <Text style={styles.section}>Packages</Text>
        {packages.length === 0 ? (
          <EmptyState
            title="No packages listed"
            body="Contact this vendor on the web marketplace for a custom quote."
          />
        ) : (
          packages.map((pkg) => (
            <Card key={pkg.name}>
              <Text style={styles.pkgName}>{pkg.name}</Text>
              <Text style={styles.price}>
                Rs {pkg.price.toLocaleString("en-PK")}
                {pkg.perHead ? " / head" : ""}
              </Text>
              {pkg.description ? (
                <Text style={styles.desc}>{pkg.description}</Text>
              ) : null}
              <View style={{ marginTop: spacing.sm }}>
                <PrimaryButton
                  label="Book"
                  loading={bookingPkg === pkg.name}
                  disabled={bookingPkg !== null}
                  onPress={() => void bookPackage(pkg)}
                />
              </View>
            </Card>
          ))
        )}

        <SecondaryButton label="Back" onPress={() => router.back()} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
    marginBottom: 4,
  },
  bio: {
    marginTop: spacing.sm,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: colors.maroonDark,
  },
  pkgName: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: colors.ink,
  },
  price: {
    marginTop: 6,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: colors.maroon,
  },
  desc: {
    marginTop: 6,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
})
