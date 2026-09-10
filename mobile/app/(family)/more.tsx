import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BrandTitle, Card, Screen } from "@/src/components/ui"
import { colors, spacing } from "@/src/lib/theme"
import { openWebPath } from "@/src/lib/web"

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
    href: "/(family)/notifications" as const,
    title: "Notifications",
    body: "Tasks and booking alerts",
  },
  {
    href: "/(family)/settings" as const,
    title: "Settings",
    body: "Account, wedding, sign out",
  },
]

const WEB_LINKS = [
  { path: "/wedding-ai", title: "Wedding AI", body: "Planning help in the web app" },
  { path: "/seating", title: "Seating", body: "Arrange tables and seating" },
  { path: "/upgrade", title: "Upgrade", body: "Unlock premium features" },
  { path: "/settings", title: "PDF / plan", body: "Export plan and PDF tools" },
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

        <Text style={styles.section}>On the web</Text>
        {WEB_LINKS.map((link) => (
          <Pressable
            key={link.path}
            onPress={() => void openWebPath(link.path)}
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
  section: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: colors.maroonDark,
  },
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
