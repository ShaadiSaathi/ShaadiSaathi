import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, Screen } from "@/src/components/ui"
import { colors, spacing } from "@/src/lib/theme"

const APP_LINKS = [
  {
    href: "/(family)/events" as const,
    title: "Events",
    body: "Mehndi, Baraat, Walima schedule",
  },
  {
    href: "/(family)/schedule" as const,
    title: "Schedule",
    body: "Timeline of events and open tasks",
  },
  {
    href: "/(family)/vendors" as const,
    title: "Vendors",
    body: "Browse marketplace vendors",
  },
  {
    href: "/(family)/wedding-ai" as const,
    title: "Wedding AI",
    body: "Ask planning questions (Premium)",
  },
  {
    href: "/(family)/seating" as const,
    title: "Seating",
    body: "Assign guests to tables (Premium)",
  },
  {
    href: "/(family)/export-pdf" as const,
    title: "Export PDF",
    body: "Download wedding plan PDF (Premium)",
  },
  {
    href: "/(family)/upgrade" as const,
    title: "Premium",
    body: "Unlock AI, seating, themes, PDF",
  },
  {
    href: "/(family)/notifications" as const,
    title: "Notifications",
    body: "Tasks and booking alerts",
  },
  {
    href: "/(family)/settings" as const,
    title: "Settings",
    body: "Themes, collaborators, account",
  },
]

export default function MoreScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <BrandTitle subtitle="More wedding tools" />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {APP_LINKS.map((link) => (
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
