import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "신구비교 — 북한 법령 판본 비교",
  description: "북한 법령 두 판본의 조문을 의미(임베딩 유사도)로 짝지어 신설·삭제·변경을 찾고, AI 가 변화 리포트를 씁니다. 예: 헌법 2023 → 2026.",
  alternates: { canonical: "https://www.nk-law.kr/diff" },
};

export default function DiffLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
