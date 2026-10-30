"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChatWidget from "@/components/ChatWidget";
import { useChatSidebar } from "@/components/ChatSidebarProvider";

// 사이드바·오버레이의 top. 헤더(상단 네비바)의 화면상 아래 끝을 CSS 변수로 받는다(T40).
// 헤더 높이는 화면 폭(데스크톱 56·모바일 64)과 모바일 메뉴 펼침에 따라 바뀌고, 헤더는 스크롤과 함께
// 올라가므로 고정값(예전 49px)이면 헤더를 덮거나 위에 틈이 생겼다. 값이 오기 전에는 56px.
const CHAT_TOP = "var(--chat-top, 56px)";

/** 헤더 아래 끝(화면 기준, 0 이상)을 :root 의 --chat-top 에 계속 써 둔다. React state 를 쓰지 않아
 *  스크롤 중에도 사이드바(ChatWidget)를 다시 그리지 않는다. */
function useHeaderBottomVar() {
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const bottom = Math.max(0, Math.round(header.getBoundingClientRect().bottom));
      root.style.setProperty("--chat-top", `${bottom}px`);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    const ro = new ResizeObserver(schedule);  // 폭 변화·모바일 메뉴 펼침/접힘
    ro.observe(header);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

/**
 * 오른쪽에서 슬라이드되는 채팅 사이드바.
 * - 헤더의 화면상 아래 끝(--chat-top)부터 시작해 상단 네비바를 가리지 않는다. 스크롤로 헤더가
 *   올라가면 그만큼 위로 붙어 틈이 생기지 않는다(T40).
 * - 데스크탑: 메인 영역과 공존(메인은 MainShell 이 오른쪽으로 밀어줌). 오버레이 없음.
 * - 모바일: 화면 대부분을 덮는 패널 + 어두운 오버레이.
 * - 채팅 이력 유지: 한 번 열린 뒤에는 ChatWidget 을 계속 마운트한 채 패널만 숨겨,
 *   닫았다 열어도 대화 state 가 보존된다 (페이지 리프레시 시에는 초기화).
 */
/** 화면 키보드 등으로 가려진 화면 아래쪽 높이를 :root 의 --chat-bottom 에 쓴다(T41).
 *  안드로이드 Chrome·Firefox 는 layout.tsx 의 viewport interactive-widget=resizes-content 로 레이아웃 자체가
 *  줄어 이 값이 0 이다. iOS Safari 는 그 설정을 모르고 키보드가 화면을 덮기만 해서(visualViewport 만 줄어듦)
 *  그만큼 패널 아래 끝을 올려 입력창이 키보드 위에 오게 한다. 확대(핀치) 중에는 쓰지 않는다. */
function useKeyboardInsetVar() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const inset = vv.scale > 1.01 ? 0 : Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
      root.style.setProperty("--chat-bottom", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
}

export default function ChatSidebar() {
  const { isOpen, close, width, setWidth, isDesktop, setResizing } = useChatSidebar();
  const [mounted, setMounted] = useState(false);
  const resizing = useRef(false);
  const closeTouch = useRef<{ x: number; y: number } | null>(null);
  useHeaderBottomVar();
  useKeyboardInsetVar();

  // 최초로 열린 시점부터 ChatWidget 을 계속 마운트 유지
  useEffect(() => {
    if (isOpen) setMounted(true);
  }, [isOpen]);

  // 모바일·태블릿(오버레이 화면)에서 열려 있는 동안 뒤 페이지 스크롤을 잠그고, 닫으면 원래 위치로 돌린다(T41).
  // overflow:hidden 만으로는 iOS Safari 가 막히지 않아 body 를 지금 위치 그대로 고정(position:fixed; top:-scrollY)한다.
  // 데스크톱(push 레이아웃)은 본문을 함께 보며 쓰므로 잠그지 않는다.
  useEffect(() => {
    if (!isOpen || isDesktop) return;
    const y = window.scrollY;
    const s = document.body.style;
    const prev = { position: s.position, top: s.top, left: s.left, right: s.right, width: s.width, overflow: s.overflow };
    Object.assign(s, { position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%", overflow: "hidden" });
    return () => {
      Object.assign(s, prev);
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }, [isOpen, isDesktop]);

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
        style={{ top: CHAT_TOP }}
        className={`fixed inset-x-0 bottom-0 z-[9990] bg-black/30 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!isOpen}
      />

      {/* 사이드 패널 — 헤더 아래부터 화면 하단까지. 데스크탑은 드래그로 너비 조절 */}
      <aside
        style={{ top: CHAT_TOP, bottom: "var(--chat-bottom, 0px)", width: isDesktop ? width : undefined }}
        className={`fixed right-0 z-[9991] flex w-full flex-col bg-white transition-transform duration-300 ease-in-out sm:w-[420px] ${
          // 닫힌 패널의 그림자가 화면 오른쪽 끝에 흰 띠로 비치지 않게 닫히면 그림자를 뺀다(T42)
          isOpen ? "translate-x-0 shadow-2xl" : "translate-x-full shadow-none"
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
          {/* T42: 채팅창을 손가락으로 튕기듯 쓸어 넘긴 직후의 탭에는 브라우저가 click 을 만들지 않는 경우가 있어
              (스크롤 멈춤으로 쓰임, T38 과 같은 현상) 터치는 손을 뗄 때 닫는다. 버튼 위에서 10px 넘게 움직였으면 닫지 않는다. */}
          <button
            onClick={close}
            onTouchStart={(e) => {
              const t = e.touches[0];
              closeTouch.current = t ? { x: t.clientX, y: t.clientY } : null;
            }}
            onTouchEnd={(e) => {
              const start = closeTouch.current;
              const t = e.changedTouches[0];
              closeTouch.current = null;
              if (!start || !t || Math.hypot(t.clientX - start.x, t.clientY - start.y) > 10) return;
              if (e.cancelable) e.preventDefault(); // 뒤따르는 click 으로 두 번 닫히지 않게
              close();
            }}
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
