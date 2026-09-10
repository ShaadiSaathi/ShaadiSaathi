import { Link, Stack } from "expo-router"
import { StyleSheet, Text, View } from "react-native"
import { colors, spacing } from "@/src/lib/theme"

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ivory,
    padding: spacing.lg,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: colors.maroon,
  },
  link: { marginTop: spacing.md },
  linkText: {
    fontFamily: "DMSans_500Medium",
    color: colors.goldDark,
  },
})
