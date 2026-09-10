import { useEffect, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BrandTitle,
  Card,
  ErrorText,
  Field,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/src/components/ui"
import { useAuth } from "@/src/context/AuthContext"
import { useVendor } from "@/src/hooks/useWeddingData"
import { WEDDING_EVENTS } from "@/src/lib/events"
import { VENDOR_CATEGORIES } from "@/src/lib/premium"
import { saveVendorPayoutAccount, saveVendorProfile } from "@/src/lib/premium-api"
import { colors, spacing } from "@/src/lib/theme"
import type { EventId } from "@/src/lib/types"
import { uploadVendorImage } from "@/src/lib/upload"

export default function VendorOnboardingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user, profile } = useAuth()
  const vendorId = profile?.vendorId ?? null
  const { vendor, loading } = useVendor(vendorId)
  const [businessName, setBusinessName] = useState("")
  const [city, setCity] = useState("")
  const [phone, setPhone] = useState("")
  const [bio, setBio] = useState("")
  const [email, setEmail] = useState("")
  const [cnic, setCnic] = useState("")
  const [startingPrice, setStartingPrice] = useState("50000")
  const [pricingNotes, setPricingNotes] = useState("")
  const [categoryId, setCategoryId] = useState("catering")
  const [availableFor, setAvailableFor] = useState<EventId[]>([
    "mehndi",
    "baraat",
    "walima",
  ])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [iban, setIban] = useState("")
  const [accountHolderName, setAccountHolderName] = useState("")
  const [bankName, setBankName] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!vendor) return
    setBusinessName(vendor.name || "")
    setCity(vendor.city || "")
    setPhone(profile?.phone || "")
    setBio(vendor.bio || "")
    setCategoryId(vendor.categoryId || vendor.category || "catering")
    setStartingPrice(String(vendor.startingPrice ?? 50000))
    if (vendor.availableFor?.length) setAvailableFor(vendor.availableFor)
    if (vendor.packages?.length === 0 && vendor) {
      /* keep */
    }
  }, [vendor, profile?.phone])

  function toggleEvent(id: EventId) {
    setAvailableFor((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    )
  }

  async function addPhoto() {
    if (!vendorId || !user) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError("Photo library permission is required")
      return
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    })
    if (picked.canceled || !picked.assets[0]) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadVendorImage({
        vendorId,
        uid: user.uid,
        uri: picked.assets[0].uri,
        mimeType: picked.assets[0].mimeType,
      })
      setPhotoUrls((u) => [...u, url])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!vendorId || !user) {
      setError("Finish vendor signup on web first to link a vendor profile.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await saveVendorProfile({
        vendorId,
        ownerUid: user.uid,
        businessName,
        categoryId,
        city,
        phone: phone || profile?.phone || "",
        bio,
        startingPrice: Number(startingPrice) || 0,
        availableFor,
        email,
        pricingNotes,
        cnic,
        photoUrls,
      })
      if (iban.trim() && accountHolderName.trim() && bankName.trim()) {
        await saveVendorPayoutAccount({
          vendorId,
          ownerUid: user.uid,
          iban,
          accountHolderName,
          bankName,
        })
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (done) {
    return (
      <Screen style={{ paddingTop: insets.top + spacing.md }}>
        <BrandTitle subtitle="Submitted for review" />
        <Text style={styles.meta}>
          Your KYC and portfolio were saved. Verification usually completes after
          admin review.
        </Text>
        <PrimaryButton label="Done" onPress={() => router.back()} />
      </Screen>
    )
  }

  return (
    <Screen style={{ paddingTop: insets.top + spacing.md }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xl }}>
        <BrandTitle subtitle="Vendor onboarding & KYC" />
        <ErrorText message={error} />
        {!vendorId ? (
          <Card>
            <Text style={styles.meta}>
              No vendor profile linked yet. Create one on first vendor signup, then
              return here to finish onboarding.
            </Text>
          </Card>
        ) : null}
        <Field label="Business name" value={businessName} onChangeText={setBusinessName} />
        <Field label="City" value={city} onChangeText={setCity} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <Field label="CNIC / ID" value={cnic} onChangeText={setCnic} />
        <Field
          label="Starting price (PKR)"
          value={startingPrice}
          onChangeText={setStartingPrice}
          keyboardType="numeric"
        />
        <Field
          label="Bio (min 20 chars)"
          value={bio}
          onChangeText={setBio}
          multiline
        />
        <Field
          label="Pricing notes"
          value={pricingNotes}
          onChangeText={setPricingNotes}
        />

        <Text style={styles.section}>Category</Text>
        <View style={styles.chips}>
          {VENDOR_CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setCategoryId(c.id)}
              style={[styles.chip, categoryId === c.id && styles.chipOn]}
            >
              <Text
                style={[
                  styles.chipText,
                  categoryId === c.id && styles.chipTextOn,
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Available for</Text>
        <View style={styles.chips}>
          {WEDDING_EVENTS.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => toggleEvent(e.id)}
              style={[
                styles.chip,
                availableFor.includes(e.id) && styles.chipOn,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  availableFor.includes(e.id) && styles.chipTextOn,
                ]}
              >
                {e.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>
          Portfolio photos ({photoUrls.length})
        </Text>
        <SecondaryButton label="Add photo" onPress={() => void addPhoto()} />

        <Text style={styles.section}>Payout account (optional)</Text>
        <Field label="IBAN" value={iban} onChangeText={setIban} autoCapitalize="characters" />
        <Field
          label="Account holder"
          value={accountHolderName}
          onChangeText={setAccountHolderName}
        />
        <Field label="Bank name" value={bankName} onChangeText={setBankName} />

        <PrimaryButton
          label="Submit for verification"
          loading={busy}
          onPress={() => void submit()}
        />
        <SecondaryButton label="Cancel" onPress={() => router.back()} />
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontFamily: "DMSans_500Medium", color: colors.ink, fontSize: 13 },
  chipTextOn: { color: colors.white },
  meta: {
    fontFamily: "DMSans_400Regular",
    color: colors.muted,
    lineHeight: 20,
  },
})
