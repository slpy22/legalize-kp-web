import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "법령 찾기",
  description: "북한 법령 333건을 법령명·조문 내용으로 검색(키워드·시맨틱·하이브리드)하거나 분야별로 둘러보기.",
  alternates: { canonical: "https://www.nk-law.kr/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
