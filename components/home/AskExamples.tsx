"use client";

import { useChatSidebar } from "@/components/ChatSidebarProvider";

/** AI 상담 예시 질문 버튼(T42). 누르면 사이드바가 열리며 그 질문을 바로 보낸다. */
export default function AskExamples({ questions }: { questions: string[] }) {
  const { ask } = useChatSidebar();
  return (
    <div className="flex flex-col gap-2">
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => ask(q)}
          className="group flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-800 transition-colors hover:border-navy-light hover:bg-navy-light/5"
        >
          <span>{q}</span>
          <span aria-hidden className="shrink-0 text-navy-light transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </button>
      ))}
    </div>
  );
}
