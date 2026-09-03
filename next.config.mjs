/** @type {import('next').NextConfig} */
const getValidNextAuthUrl = () => {
  const url = process.env.NEXTAUTH_URL;
  if (url && typeof url === "string" && url.trim().length > 0) {
    return url.trim();
  }
  // 구글 콘솔에 등록된 공식 고정 프로덕션 도메인 사용 (임의의 배포 해시 도메인 차단 방지)
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
