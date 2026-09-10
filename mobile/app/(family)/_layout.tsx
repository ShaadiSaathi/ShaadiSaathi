import { Redirect, Tabs } from "expo-router"
import { Text } from "react-native"
import { useAuth } from "@/src/context/AuthContext"
import { LoadingBlock, Screen } from "@/src/components/ui"
import { colors } from "@/src/lib/theme"

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontFamily: focused ? "DMSans_700Bold" : "DMSans_500Medium",
        color: focused ? colors.maroon : colors.muted,
      }}
    >
      {label}
    </Text>
  )
}

export default function FamilyLayout() {
  const { status, profile } = useAuth()

  if (status === "loading") {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    )
  }
  if (status !== "signedIn") return <Redirect href="/(auth)/login" />
  if (profile?.role === "vendor") return <Redirect href="/(vendor)/dashboard" />
  if (!profile?.weddingId) return <Redirect href="/(auth)/onboarding" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.maroon,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.ivory,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontFamily: "DMSans_500Medium", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="guests"
        options={{
          title: "Guests",
          tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => <TabIcon label="✓" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          tabBarIcon: ({ focused }) => <TabIcon label="◇" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon label="···" focused={focused} />,
        }}
      />
      <Tabs.Screen name="events" options={{ href: null }} />
      <Tabs.Screen name="vendors" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="schedule" options={{ href: null }} />
      <Tabs.Screen name="guest/[id]" options={{ href: null }} />
      <Tabs.Screen name="vendor/[id]" options={{ href: null }} />
      <Tabs.Screen name="booking/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="booking/[id]/messages" options={{ href: null }} />
      <Tabs.Screen name="event/[id]" options={{ href: null }} />
      <Tabs.Screen name="wedding-ai" options={{ href: null }} />
      <Tabs.Screen name="seating" options={{ href: null }} />
      <Tabs.Screen name="upgrade" options={{ href: null }} />
      <Tabs.Screen name="export-pdf" options={{ href: null }} />
      <Tabs.Screen name="pay" options={{ href: null }} />
    </Tabs>
  )
}
