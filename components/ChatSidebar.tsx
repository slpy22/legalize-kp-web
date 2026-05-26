"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatWidget from "@/components/ChatWidget";
import { useChatSidebar } from "@/components/ChatSidebarProvider";

// 헤더(상단 네비바) 높이. 사이드바가 헤더를 가리지 않도록 이만큼 내린다.
const HEADER_OFFSET = "49px";

/**
 * 오른쪽에서 슬라이드되는 채팅 사이드바.
 * - 헤더 아래(top: 49px)부터 시작해 상단 네비바를 가리지 않는다.
 * - 데스크탑: 메인 영역과 공존(메인은 MainShell 이 오른쪽으로 밀어줌). 오버레이 없음.
 * - 모바일: 화면 대부분을 덮는 패널 + 어두운 오버레이.
 * - 채팅 이력 유지: 한 번 열린 뒤에는 ChatWidget 을 계속 마운트한 채 패널만 숨겨,
 *   닫았다 열어도 대화 state 가 보존된다 (페이지 리프레시 시에는 초기화).
 */
export default function ChatSidebar() {
  const { isOpen, close, width, setWidth, isDesktop, setResizing } = useChatSidebar();
  const [mounted, setMounted] = useState(false);
  const resizing = useRef(false);

  // 최초로 열린 시점부터 ChatWidget 을 계속 마운트 유지
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // ESC 로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // ── 너비 드래그 조절 (데스크탑) ──
  const onResizeDown = useCallback((e: React.PointerEvent) => {
    resizing.current = true;
    setResizing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
    e.preventDefault();
  }, [setResizing]);

  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizing.current) return;
    // 사이드바는 화면 오른쪽에 고정 → 너비 = 창너비 - 포인터X
    setWidth(window.innerWidth - e.clientX);
  }, [setWidth]);

  const onResizeUp = useCallback((e: React.PointerEvent) => {
    resizing.current = false;
    setResizing(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, [setResizing]);

  return (
    <>
      {/* 모바일 전용 오버레이 (데스크탑은 push 레이아웃이라 불필요). 헤더는 가리지 않음 */}
      <div
        onClick={close}
        style={{ top: HEADER_OFFSET }}
        className={`fixed inset-x-0 bottom-0 z-[9990] bg-black/30 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* 사이드 패널 — 헤더 아래부터 화면 하단까지. 데스크탑은 드래그로 너비 조절 */}
      <aside
        style={{ top: HEADER_OFFSET, width: isDesktop ? width : undefined }}
        className={`fixed bottom-0 right-0 z-[9991] flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out sm:w-[420px] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
        role="complementary"
      >
        {/* 너비 조절 핸들 (데스크탑 전용) — 패널 왼쪽 가장자리 */}
        {isDesktop && (
          <div
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            title="드래그하여 너비 조절"
            className="group absolute left-0 top-0 z-10 flex h-full w-2 cursor-ew-resize items-center justify-center hover:bg-navy-light/10"
            style={{ touchAction: "none" }}
          >
            <div className="h-10 w-1 rounded-full bg-gray-300 transition-colors group-hover:bg-navy-light" />
          </div>
        )}
        {/* 헤더 바 */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-navy px-4 py-2.5 text-white">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-sm font-semibold">북한법 AI 상담</span>
          </div>
          <button
            onClick={close}
            aria-label="닫기"
            className="rounded p-1 transition-colors hover:bg-white/15"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* 채팅 본문 — 첫 오픈 후 계속 마운트하여 대화 이력 보존 */}
        <div className="min-h-0 flex-1">
          {mounted && <ChatWidget />}
        </div>
      </aside>
    </>
  );
}
