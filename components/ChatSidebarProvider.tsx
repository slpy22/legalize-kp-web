"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

const MIN_W = 320;
const MAX_W = 820;
const DEFAULT_W = 440;

interface ChatSidebarCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  width: number;
  setWidth: (w: number) => void;
  isDesktop: boolean;
  isResizing: boolean;
  setResizing: (v: boolean) => void;
  /** 사이드바를 열고 이 질문을 바로 보낸다(T42, 홈의 예시 질문). ChatWidget 이 받아 전송하고 비운다 */
  ask: (question: string) => void;
  pendingQuestion: string | null;
  takePendingQuestion: () => string | null;
}

const Ctx = createContext<ChatSidebarCtx | null>(null);

export function ChatSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [width, setWidthState] = useState(DEFAULT_W);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isResizing, setResizing] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const ask = useCallback((question: string) => {
    setPendingQuestion(question);
    setIsOpen(true);
  }, []);
  const takePendingQuestion = useCallback(() => {
    const q = pendingQuestion;
    if (q !== null) setPendingQuestion(null);
    return q;
  }, [pendingQuestion]);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const setWidth = useCallback((w: number) => {
    const clamped = Math.max(MIN_W, Math.min(MAX_W, Math.round(w)));
    setWidthState(clamped);
    try {
      localStorage.setItem("nk_chat_width", String(clamped));
    } catch {}
  }, []);

  // 초기화: 저장된 너비 복원 + 데스크탑 여부 감지
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("nk_chat_width"));
      if (saved >= MIN_W && saved <= MAX_W) setWidthState(saved);
    } catch {}
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Ctx.Provider value={{ isOpen, open, close, toggle, width, setWidth, isDesktop, isResizing, setResizing, ask, pendingQuestion, takePendingQuestion }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatSidebar(): ChatSidebarCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      width: DEFAULT_W,
      setWidth: () => {},
      isDesktop: false,
      isResizing: false,
      setResizing: () => {},
      ask: () => {},
      pendingQuestion: null,
      takePendingQuestion: () => null,
    };
  }
  return ctx;
}
