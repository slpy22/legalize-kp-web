"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChatSidebar } from "@/components/ChatSidebarProvider";
import AuthMenu from "@/components/AuthMenu";

type NavItem =
  | { kind: "link"; href: string; label: string }
  | {
      kind: "group";
      label: string;
      matchPrefix: string;
      items: { href: string; label: string }[];
    };

// T42: 강점(신구비교·남북비교·용어비교)을 메뉴 1단계로 편다. 홈·통계는 그대로 둔다(URL 도 모두 그대로).
const NAV: NavItem[] = [
  { kind: "link", href: "/", label: "홈" },
  { kind: "link", href: "/search", label: "법령 찾기" },
  { kind: "link", href: "/diff", label: "신구비교" },
  { kind: "link", href: "/compare", label: "남북비교" },
  { kind: "link", href: "/compare/terms", label: "용어비교" },
  { kind: "link", href: "/stats", label: "통계" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  // 법령 찾기: 검색·분야 목록·법령 본문(개정이력 포함)
  if (href === "/search") {
    return ["/search", "/category", "/law"].some((p) => pathname.startsWith(p));
  }
  // /compare 는 하위 /compare/terms 진입 시 비활성
  if (href === "/compare") {
    return pathname.startsWith("/compare") && !pathname.startsWith("/compare/terms");
  }
  return pathname.startsWith(href);
}

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const { toggle: toggleChat, isOpen: chatOpen } = useChatSidebar();

  // 챗봇이 열리면 모바일 메뉴를 접는다(T40). 펼친 메뉴만큼 헤더가 길어져 채팅창이 그 아래로 짧게 열렸다.
  // effect 대신 렌더 중에 이전 값과 비교한다(React 권장 패턴).
  const [prevChatOpen, setPrevChatOpen] = useState(chatOpen);
  if (chatOpen !== prevChatOpen) {
    setPrevChatOpen(chatOpen);
    if (chatOpen) setMenuOpen(false);
  }

  // 그룹 드롭다운: 외부 클릭/Esc 로 닫기
  useEffect(() => {
    if (!groupOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!groupRef.current?.contains(e.target as Node)) setGroupOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGroupOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [groupOpen]);

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* 로고 + 운영주체 */}
        <div className="flex items-baseline gap-2">
          <Link
            href="/"
            className="flex items-baseline gap-2 text-base font-bold tracking-tight sm:text-lg"
            onClick={() => setMenuOpen(false)}
          >
            {/* 사이트 아이콘(T39). 남색 헤더에서 보이도록 흰 둥근 판에 얹는다(파비콘과 같은 흰 바탕·남색 그림).
                높이는 타이틀 줄 높이(모바일 24px·sm 이상 28px)에 맞춰 헤더 높이를 바꾸지 않는다.
                옆 글자와 같은 링크라 alt 는 비운다(화면낭독기가 이름을 두 번 읽지 않게). */}
            <span className="flex h-6 w-6 shrink-0 self-center rounded-md bg-white p-0.5 sm:h-7 sm:w-7">
              <Image src="/brand/nk-law-mark.png" alt="" width={24} height={24} unoptimized className="h-full w-full" />
            </span>
            북한법률정보센터
          </Link>
          <a
            href="https://www.nkls.or.kr/index.ink"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-xs font-normal text-white/60 transition-colors hover:text-white/90 sm:inline"
            title="통일과 북한법학회 홈페이지"
          >
            통일과 북한법학회
          </a>
        </div>

        {/* 데스크톱 네비게이션 */}
        <nav className="hidden gap-1 lg:flex">
          {NAV.map((item) => {
            if (item.kind === "link") {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${active ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
                >
                  {item.label}
                </Link>
              );
            }
            // group (드롭다운)
            const groupActive = pathname.startsWith(item.matchPrefix);
            return (
              <div key={item.label} ref={groupRef} className="relative">
                <button
                  type="button"
                  onClick={() => setGroupOpen((v) => !v)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${groupActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
                  aria-haspopup="menu"
                  aria-expanded={groupOpen}
                >
                  {item.label}
                  <span className="ml-1 text-xs">▾</span>
                </button>
                {groupOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-md border border-gray-200 bg-white text-gray-800 shadow-lg"
                  >
                    {item.items.map((sub) => {
                      const subActive = isActive(sub.href, pathname);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setGroupOpen(false)}
                          role="menuitem"
                          className={`block px-4 py-2 text-sm transition-colors ${subActive ? "bg-navy-light/10 font-semibold text-navy" : "hover:bg-gray-100"}`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {/* AI 상담은 페이지가 아니라 사이드바라 테두리 버튼으로 구분한다(T42) */}
          <button
            onClick={toggleChat}
            className="ml-1 rounded border border-white/40 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10"
          >
            AI 상담
          </button>
          {/* T43: 로그인(선택) — 기능이 준비되지 않았으면 보이지 않는다 */}
          <AuthMenu variant="desktop" />
        </nav>

        {/* 모바일 햄버거 */}
        <button className="p-2 lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="메뉴">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <>
                <path d="M3 6h18" />
                <path d="M3 12h18" />
                <path d="M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* 모바일 메뉴 드롭다운 */}
      {menuOpen && (
        <nav className="border-t border-white/10 px-4 pb-3 lg:hidden">
          {NAV.map((item) => {
            if (item.kind === "link") {
              const active = isActive(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded px-3 py-2 text-sm transition-colors ${active ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
                >
                  {item.label}
                </Link>
              );
            }
            // 모바일에선 그룹을 라벨 + 들여쓴 하위 항목으로 펼쳐 표시
            return (
              <div key={item.label} className="mt-1">
                <div className="px-3 py-1 text-xs uppercase text-white/40">{item.label}</div>
                {item.items.map((sub) => {
                  const subActive = isActive(sub.href, pathname);
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded px-5 py-2 text-sm transition-colors ${subActive ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
          <button
            onClick={() => {
              setMenuOpen(false);
              toggleChat();
            }}
            className="block w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
          >
            AI 상담
          </button>
          <AuthMenu variant="mobile" onNavigate={() => setMenuOpen(false)} />
        </nav>
      )}
    </header>
  );
}
