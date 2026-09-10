const fs = require("fs")
const path = require("path")

const appEnv = process.env.EXPO_PUBLIC_APP_ENV === "staging" ? "staging" : "production"
const firebaseDir = path.join(__dirname, "firebase", appEnv)
const webConfigPath = path.join(firebaseDir, "firebase-web.json")

let webConfig = {}
if (fs.existsSync(webConfigPath)) {
  webConfig = JSON.parse(fs.readFileSync(webConfigPath, "utf8"))
}

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  (appEnv === "staging"
    ? "https://shaadi-saathi-git-staging-altafemaad2009-2751s-projects.vercel.app"
    : "https://shaadi-saathi-kappa.vercel.app")

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Shaadi Saathi",
  slug: "shaadi-saathi",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "shaadisaathi",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.shaadisaathi.app",
    googleServicesFile: `./firebase/${appEnv}/GoogleService-Info.plist`,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#FDF6ED",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: "com.shaadisaathi.app",
    googleServicesFile: `./firebase/${appEnv}/google-services.json`,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#FDF6ED",
      },
    ],
    "expo-secure-store",
    "expo-font",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Shaadi Saathi to upload vendor portfolio photos.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv,
    apiUrl,
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || webConfig.apiKey,
      authDomain:
        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || webConfig.authDomain,
      projectId:
        process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || webConfig.projectId,
      storageBucket:
        process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        webConfig.storageBucket,
      messagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
        webConfig.messagingSenderId,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || webConfig.appId,
      measurementId: webConfig.measurementId,
    },
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
}
