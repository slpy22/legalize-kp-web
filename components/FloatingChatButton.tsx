"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatSidebar } from "@/components/ChatSidebarProvider";

// 이만큼(px) 움직여야 드래그로 본다. 그보다 작은 떨림(손가락·마우스 1~2px)은 탭·클릭이다.
const DRAG_THRESHOLD = 6;

export default function FloatingChatButton() {
  const { isOpen, toggle } = useChatSidebar();

  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [dragging, setDragging] = useState(false);
  // 이번 누름이 드래그였는지. pointerup 핸들러에서 바로 읽어야 해서 state 가 아니라 ref.
  const moved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const pointerType = useRef("mouse");
  const dragOffset = useRef({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  // 초기 위치: 우하단 (모바일은 좀 더 안쪽)
  useEffect(() => {
    if (pos.x === -1) {
      setPos({ x: window.innerWidth - 72, y: window.innerHeight - 90 });
    }
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(prev.x, window.innerWidth - 56),
        y: Math.min(prev.y, window.innerHeight - 56),
      }));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;  // 오른쪽·가운데 버튼은 무시
    setDragging(true);
    moved.current = false;
    pointerType.current = e.pointerType;
    dragStart.current = { x: e.clientX, y: e.clientY };
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    // 버튼 자체에 캡처(e.target 은 안쪽 svg·path 일 수 있다)
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    if (!moved.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      moved.current = true;
    }
    const size = 56;
    const newX = Math.max(0, Math.min(window.innerWidth - size, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - size, e.clientY - dragOffset.current.y));
    setPos({ x: newX, y: newY });
  }, [dragging]);

  // 열기(T38): 마우스·펜은 pointerup, 터치는 touchend 에서 한다. click 은 믿지 않는다 —
  // 모바일은 손가락을 튕기듯 드래그한 뒤의 탭에 click 을 아예 만들지 않는 경우가 있다(실측).
  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (pointerType.current !== "touch" && !moved.current) toggle();
  }, [dragging, toggle]);

  const handlePointerCancel = useCallback(() => {
    setDragging(false);
  }, []);

  // 터치: 브라우저가 터치 뒤에 따로 만드는 click(호환용)을 막고 나서 연다(T38). 예전에는 pointerup 에서
  // 열어 버튼이 사라졌고, 그 click 이 손가락 자리에 깔린 모바일 오버레이(onClick=close)에 떨어져 곧바로
  // 다시 닫혔다. touchend 는 pointerup 뒤에 오므로, 버튼이 아직 있는 여기서 막고 연다.
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();  // 드래그 끝의 touchend 는 취소할 수 없다(그때는 click 도 안 생긴다)
    if (!moved.current) toggle();
  }, [toggle]);

  // 키보드(Enter·Space)로 누른 click 만 받는다(detail 0). 마우스·터치는 pointerup 에서 이미 열었다.
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.detail === 0) toggle();
  }, [toggle]);

  // 사이드바가 열려 있으면 버튼 숨김 (사이드바 헤더의 X로 닫음)
  if (pos.x === -1 || isOpen) return null;

  return (
    <button
      ref={btnRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "#1a365d",
        color: "#fff",
        border: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
        cursor: dragging ? "grabbing" : "grab",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 24,
        touchAction: "none",
        transition: dragging ? "none" : "box-shadow 0.2s",
        userSelect: "none",
      }}
      title="AI 상담"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/>
        <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </button>
  );
}
