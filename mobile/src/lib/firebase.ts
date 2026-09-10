import Constants from "expo-constants"
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

type Extra = {
  appEnv?: string
  apiUrl?: string
  firebase?: {
    apiKey?: string
    authDomain?: string
    projectId?: string
    storageBucket?: string
    messagingSenderId?: string
    appId?: string
  }
}

function extra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra
}

function firebaseConfig() {
  const fromExtra = extra().firebase ?? {}
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || fromExtra.apiKey,
    authDomain:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || fromExtra.authDomain,
    projectId:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || fromExtra.projectId,
    storageBucket:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || fromExtra.storageBucket,
    messagingSenderId:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
      fromExtra.messagingSenderId,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || fromExtra.appId,
  }
}

export function getAppEnv(): "production" | "staging" {
  return extra().appEnv === "staging" ? "staging" : "production"
}

export function getApiBaseUrl(): string {
  const url = (
    process.env.EXPO_PUBLIC_API_URL ||
    extra().apiUrl ||
    ""
  ).replace(/\/$/, "")
  if (!url) {
    throw new Error("API URL is not configured")
  }
  return url
}

export function isFirebaseConfigured(): boolean {
  const c = firebaseConfig()
  return Boolean(c.apiKey && c.authDomain && c.projectId && c.appId)
}

let app: FirebaseApp | undefined
let auth: Auth | undefined
let db: Firestore | undefined

function reactNativePersistence(): Persistence | undefined {
  const authMod = require("firebase/auth") as {
    getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence
  }
  return authMod.getReactNativePersistence?.(AsyncStorage)
}

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Set EXPO_PUBLIC_APP_ENV and firebase configs."
    )
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig())
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
