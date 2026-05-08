"use client";

import ChatWidget from "@/components/ChatWidget";

export default function ChatPage() {
  return (
    <div className="fixed inset-0 top-[49px] flex flex-col">
      <ChatWidget />
    </div>
  );
}
