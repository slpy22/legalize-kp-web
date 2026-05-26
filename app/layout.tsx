import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import ConditionalFooter from "@/components/ConditionalFooter";
import FloatingChatButton from "@/components/FloatingChatButton";
import { ChatSidebarProvider } from "@/components/ChatSidebarProvider";
import ChatSidebar from "@/components/ChatSidebar";
import MainShell from "@/components/MainShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "북한법률정보센터 | 북한 법령 검색 및 남북법 비교",
    template: "%s | 북한법률정보센터",
  },
  description: "통일과 북한법학회가 운영하는 북한법률정보센터. 310개 북한 법령의 조문 검색, 개정이력 조회, 남북법 비교, AI 법률 상담 서비스. 북한 헌법(구 사회주의헌법), 형법, 민법 등 전문 열람.",
  keywords: ["북한법", "북한 법령", "남북법 비교", "북한 헌법", "북한 형법", "통일법제", "북한법률정보", "통일과 북한법학회"],
  authors: [{ name: "통일과 북한법학회" }],
  creator: "통일과 북한법학회",
  publisher: "통일과 북한법학회",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://www.nk-law.kr",
    siteName: "북한법률정보센터",
    title: "북한법률정보센터 | 통일과 북한법학회",
    description: "통일과 북한법학회가 운영하는 북한법률정보센터. 310개 북한 법령의 조문 검색, 개정이력 조회, 남북법 비교, AI 법률 상담.",
  },
  twitter: {
    card: "summary",
    title: "북한법률정보센터 | 통일과 북한법학회",
    description: "통일과 북한법학회가 운영하는 북한법률정보센터. 북한 법령 검색·남북법 비교·AI 법률 상담",
  },
  alternates: {
    canonical: "https://www.nk-law.kr",
  },
  verification: {
    google: "", // Search Console 인증 후 채울 것
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-surface text-foreground">
        <ChatSidebarProvider>
          <Header />
          <MainShell>{children}</MainShell>
          <ConditionalFooter />
          <FloatingChatButton />
          <ChatSidebar />
        </ChatSidebarProvider>
      </body>
    </html>
  );
}
