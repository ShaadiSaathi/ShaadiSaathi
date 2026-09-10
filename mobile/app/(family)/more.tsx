import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, Screen } from "@/src/components/ui"
import { colors, spacing } from "@/src/lib/theme"

const LINKS = [
  { href: "/(family)/events", title: "Events", body: "Mehndi, Baraat, Walima schedule" },
  { href: "/(family)/vendors", title: "Vendors", body: "Browse marketplace vendors" },
  { href: "/(family)/notifications", title: "Notifications", body: "Tasks and booking alerts" },
  { href: "/(family)/settings", title: "Settings", body: "Account, wedding, sign out" },
] as const

export default function MoreScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="More wedding tools" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {LINKS.map((link) => (
          <Pressable
            key={link.href}
            onPress={() => router.push(link.href)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Card>
              <View>
                <Text style={styles.title}>{link.title}</Text>
                <Text style={styles.body}>{link.body}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 17,
    color: colors.maroonDark,
  },
  body: {
    marginTop: 4,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: colors.muted,
  },
  pressed: { opacity: 0.85 },
})
