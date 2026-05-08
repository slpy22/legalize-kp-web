import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 법률 상담",
  description: "북한법 전문 AI 에이전트와 대화. 법령 검색, 조문 분석, 남북법 비교, 용어 해석.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
