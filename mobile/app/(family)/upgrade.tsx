import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useWedding } from "@/src/context/WeddingContext"
import {
  FAMILY_PLAN_ROWS,
  FAMILY_PREMIUM_PRICE_PKR,
} from "@/src/lib/premium"
import { colors, spacing } from "@/src/lib/theme"

export default function UpgradeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { wedding } = useWedding()
  const premium = Boolean(wedding?.isPremium)

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle
          subtitle={
            premium
              ? "You're on Premium — enjoy AI, seating, themes, and PDF export."
              : `Family Premium · Rs ${FAMILY_PREMIUM_PRICE_PKR.toLocaleString("en-PK")}`
          }
        />
        <Card>
          {FAMILY_PLAN_ROWS.map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={styles.label}>{row.label}</Text>
              <Text style={styles.free}>{row.free}</Text>
              <Text style={styles.prem}>{row.premium}</Text>
            </View>
          ))}
        </Card>
        {premium ? (
          <SecondaryButton label="Back" onPress={() => router.back()} />
        ) : (
          <>
            <PrimaryButton
              label="Continue to payment"
              onPress={() =>
                router.push({
                  pathname: "/(family)/pay",
                  params: { kind: "family-premium" },
                })
              }
            />
            <Text style={styles.note}>
              Checkout uses the same payment rails as the website. If live
              Premium checkout is not enabled yet, Shaadi Saathi can unlock
              your wedding after payment confirmation.
            </Text>
          </>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  label: {
    flex: 1.2,
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: colors.ink,
  },
  free: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: colors.muted,
  },
  prem: {
    flex: 1,
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: colors.maroon,
  },
  note: {
    marginTop: spacing.md,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
})
