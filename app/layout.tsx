import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import ConditionalFooter from "@/components/ConditionalFooter";
import FloatingChatButton from "@/components/FloatingChatButton";
import UsageTracker from "@/components/UsageTracker";
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

// T41: 안드로이드(Chrome 108+·Firefox) 화면 키보드가 뜨면 레이아웃 자체를 줄여(resizes-content) 아래에 고정된
// 챗봇 입력창이 키보드 위로 올라오게 한다. 기본값(resizes-visual)은 키보드가 덮기만 해서 입력창이 가려졌다.
// iOS Safari 는 이 값을 모르고 무시한다 — 그쪽은 ChatSidebar 의 visualViewport 보정이 맡는다.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

// T42: 강점(신구비교·AI 상담·남북 법률 비교·법용어 비교) 중심으로 다시 쓰고 옛 숫자(310)를 고쳤다.
// canonical 은 여기 두지 않는다 — 예전에는 모든 하위 페이지가 이 값(홈)을 물려받아 법령 페이지까지 '홈의 사본'으로
// 선언되고 있었다. 각 페이지(layout·generateMetadata)가 자기 주소를 canonical 로 단다. OG 이미지는
// app/opengraph-image.png(파일 규약)가 모든 페이지에 붙는다.
const DESCRIPTION =
  "통일과 북한법학회가 운영하는 북한법률정보센터. 북한 법령 333건의 조문 검색과 판본 신구비교·AI 변화 리포트, 남북 법률 비교, 남북 법용어 대조, 북한법 AI 상담.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nk-law.kr"),
  title: {
    default: "북한법률정보센터 | 북한 법령 신구비교·남북 법률 비교·AI 상담",
    template: "%s | 북한법률정보센터",
  },
  description: DESCRIPTION,
  keywords: ["북한법", "북한 법령", "신구비교", "개정 비교", "남북법 비교", "법률용어", "북한 헌법", "북한 형법", "통일법제", "북한법률정보", "통일과 북한법학회"],
  authors: [{ name: "통일과 북한법학회" }],
  creator: "통일과 북한법학회",
  publisher: "통일과 북한법학회",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "북한법률정보센터",
    title: "북한법률정보센터 | 통일과 북한법학회",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "북한법률정보센터 | 통일과 북한법학회",
    description: "북한 법령 신구비교·AI 변화 리포트·남북 법률 비교·법용어 대조·AI 상담",
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
          <UsageTracker />
          <ChatSidebar />
        </ChatSidebarProvider>
      </body>
    </html>
  );
}
