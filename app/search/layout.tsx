import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "법령 검색",
  description: "310개 북한 법령을 키워드, 시맨틱, 하이브리드 방식으로 검색. 조문 내용 전문 검색 지원.",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
