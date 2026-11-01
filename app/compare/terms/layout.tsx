import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "남북 법용어 비교",
  description: "북한 법률 용어와 대응하는 남한 용어 대조표. 예: 재판소 → 법원, 수정보충 → 개정, 비법 → 불법.",
  alternates: { canonical: "https://www.nk-law.kr/compare/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
