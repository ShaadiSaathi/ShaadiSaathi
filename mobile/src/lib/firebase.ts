import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  type Auth,
  type Persistence,
} from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId
  )
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function reactNativePersistence(): Persistence | undefined {
  // Metro resolves the RN auth bundle which exports this; web typings omit it.
  const authMod = require("firebase/auth") as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence
  }
  return authMod.getReactNativePersistence?.(AsyncStorage)
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* to mobile/.env"
    )
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig)
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const firebaseApp = getFirebaseApp()
    try {
      const persistence =
        Platform.OS === "web"
          ? browserLocalPersistence
          : reactNativePersistence()
      auth = persistence
        ? initializeAuth(firebaseApp, { persistence })
        : getAuth(firebaseApp)
    } catch {
      auth = getAuth(firebaseApp)
    }
  }
  return auth
}

export function getFirestoreDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp())
  return db
}
