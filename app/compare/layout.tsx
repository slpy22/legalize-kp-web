import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "남북 법률 비교",
  description: "북한 법령 310건에 대응하는 남한 법령 매핑. 겹치는 영역·남북 고유 규정·조문 대응·장편 체계 비교.",
  alternates: { canonical: "https://www.nk-law.kr/compare" },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
