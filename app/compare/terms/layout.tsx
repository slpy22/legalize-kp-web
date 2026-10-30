import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "남북 법용어 비교",
  description: "북한 법률 용어와 대응하는 남한 용어 대조표. 예: 로동교화형 → 징역형, 인민보안 → 경찰, 재판소 → 법원.",
  alternates: { canonical: "https://www.nk-law.kr/compare/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
