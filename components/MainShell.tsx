"use client";

import { useChatSidebar } from "@/components/ChatSidebarProvider";

/**
 * 메인 콘텐츠 래퍼. 데스크탑(lg+)에서 채팅 사이드바가 열리면
 * 오른쪽에 사이드바 너비만큼 패딩을 줘 메인을 밀어준다(오버레이 대신 push).
 * 모바일에서는 사이드바가 오버레이로 뜨므로 push 하지 않는다.
 * 사이드바 너비가 드래그로 바뀌면 이 패딩도 함께 따라간다.
 */
export default function MainShell({ children }: { children: React.ReactNode }) {
  const { isOpen, width, isDesktop, isResizing } = useChatSidebar();
  const pad = isOpen && isDesktop ? width : 0;
  return (
    <main
      className="flex-1"
      style={{
        paddingRight: pad,
        // 드래그 중에는 지연 없이 즉시 따라오도록 transition 끔
        transition: isResizing ? "none" : "padding-right 0.2s ease-in-out",
      }}
    >
      {children}
    </main>
  );
}
