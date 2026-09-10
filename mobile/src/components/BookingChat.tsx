import { useState } from "react"
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  EmptyState,
  ErrorText,
  LoadingBlock,
  PrimaryButton,
  Screen,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useMessages } from "@/src/hooks/useWeddingData"
import { sendBookingMessage } from "@/src/lib/mutations"
import { colors, spacing } from "@/src/lib/theme"

export function BookingChat({
  bookingId,
  subtitle,
}: {
  bookingId: string
  subtitle: string
}) {
  const insets = useSafeAreaInsets()
  const { user, profile } = useAuth()
  const { messages, loading } = useMessages(bookingId)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (!user || !profile || !text.trim()) return
    setSending(true)
    setError(null)
    try {
      await sendBookingMessage({
        bookingId,
        senderId: user.uid,
        senderType: profile.role === "vendor" ? "vendor" : "family",
        senderName: profile.name,
        text,
      })
      setText("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send")
    } finally {
      setSending(false)
    }
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md, paddingBottom: 0 }}>
      <BrandTitle subtitle={subtitle} />
      <ErrorText message={error} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={24}
      >
        {loading ? (
          <LoadingBlock />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            ListEmptyComponent={
              <EmptyState
                title="No messages yet"
                body="Say salaam and coordinate details here."
              />
            }
            renderItem={({ item }) => {
              const mine = item.senderId === user?.uid
              return (
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.mine : styles.theirs,
                  ]}
                >
                  {!mine && item.senderName ? (
                    <Text style={styles.sender}>{item.senderName}</Text>
                  ) : null}
                  <Text style={[styles.text, mine && styles.mineText]}>
                    {item.text}
                  </Text>
                </View>
              )
            }}
          />
        )}
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <PrimaryButton
            label="Send"
            loading={sending}
            onPress={() => void send()}
            disabled={!text.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "82%",
    borderRadius: 14,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: colors.maroon,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sender: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: colors.muted,
    marginBottom: 2,
  },
  text: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.ink,
    lineHeight: 20,
  },
  mineText: { color: colors.white },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
})
