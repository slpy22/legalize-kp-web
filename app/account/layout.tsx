import type { Metadata } from "next";

// T43: 개인 화면·관리자 화면은 검색엔진에 올리지 않는다
export const metadata: Metadata = {
  title: "내 계정",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
