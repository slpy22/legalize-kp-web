import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "남북법 비교",
  description: "308개 북한-남한법 매핑 데이터 기반 남북법 비교. 조문 대조, 체계 비교, 용어 대조표.",
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
