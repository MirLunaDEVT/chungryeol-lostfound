/** @type {import('next').NextConfig} */
const getValidNextAuthUrl = () => {
  const url = process.env.NEXTAUTH_URL;
  if (url && typeof url === "string" && url.trim().length > 0) {
    return url.trim();
  }
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim().length > 0) {
    return `https://${process.env.VERCEL_URL.trim()}`;
  }
  return "https://chungryeol-lostfound.vercel.app";
};

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXTAUTH_URL: getValidNextAuthUrl(),
  },
};

export default nextConfig;
