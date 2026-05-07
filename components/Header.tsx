"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/search", label: "법령검색" },
  { href: "/compare", label: "남북법비교" },
  { href: "/stats", label: "통계" },
  { href: "/chat", label: "AI 상담" },
] as const;

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">북한법률정보센터</span>
          <span className="hidden text-sm opacity-80 sm:inline">
            북한법률정보센터
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex gap-1">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/"
                ? pathname === "/"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-white/20 font-semibold"
                    : "hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
