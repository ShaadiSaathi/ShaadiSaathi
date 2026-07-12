import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from LAN IP (phone, other devices on Wi-Fi)
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.100.168",
    "192.168.100.71",
  ],
};

export default nextConfig;
