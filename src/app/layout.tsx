import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/common/Providers";
import Header from "@/components/common/Header";
import BottomNav from "@/components/common/BottomNav";

export const metadata: Metadata = {
  title: "충렬고 분실물 찾기 | 충렬고등학교",
  description: "충렬고등학교 학생·교사 전용 교내 분실물 찾기 및 소통 플랫폼",
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="bg-slate-100 text-slate-900 min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 max-w-4xl w-full mx-auto pb-20 md:pb-8">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
