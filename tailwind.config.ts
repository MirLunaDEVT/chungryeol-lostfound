import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        school: {
          primary: "#2563eb",   // 신뢰감 있는 코발트 블루
          primaryHover: "#1d4ed8",
          secondary: "#f97316", // 당근/발견 하이라이트 오렌지
          bg: "#f8fafc",        // 소프트 슬레이트 배경
          card: "#ffffff",
          border: "#e2e8f0",
          text: "#0f172a",
          muted: "#64748b",
          lost: "#ef4444",      // 분실 주의 레드
          found: "#10b981",     // 습득 안심 그린
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
        'float': '0 8px 24px -4px rgba(0, 0, 0, 0.12)',
      }
    },
  },
  plugins: [],
};
export default config;
