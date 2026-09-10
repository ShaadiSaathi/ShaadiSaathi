import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native"
import { colors, spacing } from "@/src/lib/theme"

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.screen, style]}>{children}</View>
}

export function BrandTitle({ subtitle }: { subtitle?: string }) {
  return (
    <View style={styles.brandBlock}>
      <Text style={styles.brand}>Shaadi Saathi</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  )
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.btnDisabled,
        pressed && !disabled && styles.btnPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  )
}

export function SecondaryButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryBtn}>
      <Text style={styles.secondaryBtnText}>{label}</Text>
    </Pressable>
  )
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  )
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null
  return <Text style={styles.error}>{message}</Text>
}

export function LoadingBlock() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.maroon} size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ivory,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandBlock: { marginBottom: spacing.lg },
  brand: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: colors.maroon,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: colors.muted,
    lineHeight: 22,
  },
  field: { marginBottom: spacing.md },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: colors.maroonDark,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: colors.ink,
  },
  primaryBtn: {
    backgroundColor: colors.maroon,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.maroon,
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.88 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: colors.maroon,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  error: {
    color: colors.danger,
    fontFamily: "DMSans_400Regular",
    marginBottom: spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
})
