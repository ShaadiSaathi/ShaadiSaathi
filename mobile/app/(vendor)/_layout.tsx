import { Redirect, Tabs } from "expo-router"
import { Text } from "react-native"
import { LoadingBlock, Screen } from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
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

export default function VendorLayout() {
  const { status, profile } = useAuth()

  if (status === "loading") {
    return (
      <Screen>
        <LoadingBlock />
      </Screen>
    )
  }
  if (status !== "signedIn") return <Redirect href="/(auth)/login" />
  if (profile?.role === "family" && profile.weddingId) {
    return <Redirect href="/(family)/dashboard" />
  }

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
        name="requests"
        options={{
          title: "Requests",
          tabBarIcon: ({ focused }) => <TabIcon label="◇" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: "Jobs",
          tabBarIcon: ({ focused }) => <TabIcon label="◆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => <TabIcon label="◎" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => <TabIcon label="⚙" focused={focused} />,
        }}
      />
      <Tabs.Screen name="job/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="job/[id]/messages" options={{ href: null }} />
    </Tabs>
  )
}
