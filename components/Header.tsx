"use client";

import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="text-base font-bold tracking-tight sm:text-lg">북한법률정보센터</span>
        </Link>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden gap-1 sm:flex">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${active ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* 모바일 햄버거 */}
        <button className="sm:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 메뉴 드롭다운 */}
      {menuOpen && (
        <nav className="border-t border-white/10 px-4 pb-3 sm:hidden">
          {NAV.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className={`block rounded px-3 py-2 text-sm transition-colors ${active ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}>
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
