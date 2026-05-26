"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatSidebar } from "@/components/ChatSidebarProvider";

/**
 * /chat 은 더 이상 별도 페이지가 아니라 오른쪽 사이드바로 열린다.
 * 직접 URL 로 들어온 경우 홈으로 보내면서 사이드바를 자동으로 연다.
 */
export default function ChatRedirect() {
  const router = useRouter();
  const { open } = useChatSidebar();

  useEffect(() => {
    open();
    router.replace("/");
  }, [open, router]);

  return (
    <div className="py-20 text-center text-gray-400">AI 상담 사이드바를 여는 중…</div>
  );
}
