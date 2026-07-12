#!/usr/bin/env node
/**
 * Start Next.js on the local network and print a QR code for phone browser preview.
 * Usage: npm run preview
 *        npm run preview:tunnel   (also starts a public tunnel fallback)
 */

import { spawn } from "node:child_process"
import os from "node:os"
import qrcode from "qrcode-terminal"

const PORT = Number(process.env.PORT ?? 3000)
const useTunnel = process.argv.includes("--tunnel")

/** First non-internal IPv4 address (Wi‑Fi / Ethernet) */
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces()
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue
    for (const entry of entries) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address
      }
    }
  }
  return null
}

function printQrBlock({ heading, url, hint }) {
  console.log("\n" + "─".repeat(56))
  console.log(heading)
  console.log("─".repeat(56))
  console.log(
    "\nScan this QR code with your phone's camera app to open Shaadi Saathi in your browser.\n"
  )
  qrcode.generate(url, { small: true })
  console.log(`\n${url}\n`)
  if (hint) console.log(hint)
}

async function waitForDevServer(port, timeoutMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, {
        redirect: "manual",
      })
      if (response.status < 500) return true
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

async function startTunnel(port) {
  const { default: localtunnel } = await import("localtunnel")
  return localtunnel({ port })
}

function startNextDev() {
  return spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "--hostname", "0.0.0.0", "--port", String(PORT)],
    {
      stdio: "inherit",
      env: process.env,
    }
  )
}

let tunnelInstance = null
let printed = false

async function printPreviewInfo() {
  if (printed) return
  printed = true

  const ip = getLocalNetworkIp()
  if (!ip) {
    console.warn(
      "\n⚠️  Could not detect a local network IP. Use localhost on this machine only,"
    )
    console.warn("   or run with --tunnel for a public URL.\n")
  } else {
    const localUrl = `http://${ip}:${PORT}`
    printQrBlock({
      heading: "📱 LOCAL NETWORK (recommended — same Wi‑Fi, fastest)",
      url: localUrl,
      hint:
        "Make sure your phone and computer are on the same Wi‑Fi network.\n" +
        `Family dashboard:  ${localUrl}/dashboard\n` +
        `Vendor dashboard:  ${localUrl}/vendor/dashboard`,
    })
  }

  console.log(`\nOn this computer: http://localhost:${PORT}\n`)

  if (useTunnel) {
    console.log("Starting public tunnel (fallback — requires internet)…\n")
    try {
      tunnelInstance = await startTunnel(PORT)
      printQrBlock({
        heading:
          "🌐 PUBLIC TUNNEL (fallback — use when not on the same Wi‑Fi)",
        url: tunnelInstance.url,
        hint:
          "Slower than local network. First visit may show a tunnel warning page — continue to open the app.",
      })
      tunnelInstance.on("close", () => {
        console.log("\nTunnel closed.\n")
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`\n⚠️  Tunnel failed: ${message}`)
      console.error("   Local network preview above may still work on the same Wi‑Fi.\n")
    }
  } else {
    console.log(
      "💡 Not on the same Wi‑Fi? Run: npm run preview:tunnel\n" +
        "   (adds a public URL + QR code — slower, needs internet)\n"
    )
  }
}

const child = startNextDev()

child.on("error", (error) => {
  console.error("Failed to start Next.js dev server:", error)
  process.exit(1)
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})

waitForDevServer(PORT)
  .then((ready) => {
    if (!ready) {
      console.warn("\n⚠️  Dev server did not respond in time; printing QR anyway.\n")
    }
    return printPreviewInfo()
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

async function shutdown() {
  if (tunnelInstance) {
    await tunnelInstance.close()
  }
  child.kill("SIGTERM")
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
