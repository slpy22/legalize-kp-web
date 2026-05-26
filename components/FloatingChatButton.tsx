"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChatSidebar } from "@/components/ChatSidebarProvider";

export default function FloatingChatButton() {
  const { isOpen, toggle } = useChatSidebar();

  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [dragging, setDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    setHasMoved(false);
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    setHasMoved(true);
    const size = 56;
    const newX = Math.max(0, Math.min(window.innerWidth - size, e.clientX - dragOffset.current.x));
    const newY = Math.max(0, Math.min(window.innerHeight - size, e.clientY - dragOffset.current.y));
    setPos({ x: newX, y: newY });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    if (!hasMoved) {
      toggle();
    }
  }, [hasMoved, toggle]);

  // 사이드바가 열려 있으면 버튼 숨김 (사이드바 헤더의 X로 닫음)
  if (pos.x === -1 || isOpen) return null;

  return (
    <button
      ref={btnRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
