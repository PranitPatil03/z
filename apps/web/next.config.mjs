/** @type {import('next').NextConfig} */
const defaultAllowedDevOrigins = ["localhost", "127.0.0.1", "192.168.0.113"];

const envAllowedDevOrigins = process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS
  ? process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

const nextConfig = {
  allowedDevOrigins: [...new Set([...defaultAllowedDevOrigins, ...envAllowedDevOrigins])],
};

export default nextConfig;
