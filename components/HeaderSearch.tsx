"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import LawNameInput from "@/components/LawNameInput";

/**
 * 헤더 검색(T50) — '법령 찾기' 메뉴를 뺀 대신 어느 화면에서나 검색. 아이콘을 누르면 헤더 아래에 한 줄로 열린다.
 * 후보를 고르면 그 법령으로, 그냥 Enter·검색 버튼이면 /search 로 간다.
 */
export function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export default function HeaderSearch({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const go = (path: string) => {
    onDone();
    router.push(path);
  };
  const search = () => {
    const t = q.trim();
    if (t) go(`/search?q=${encodeURIComponent(t)}&mode=hybrid`);
  };
  return (
    <form
      role="search"
      aria-label="법령 검색"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        search();
      }}
      onKeyDown={(e) => {
        // 후보 목록이 닫혀 있을 때의 Esc 는 검색줄을 닫는다(목록이 열려 있으면 입력창이 먼저 처리)
        if (e.key === "Escape" && !e.defaultPrevented) onDone();
      }}
      className="mx-auto flex max-w-6xl gap-2 px-4 pb-3"
    >
      <LawNameInput
        value={q}
        onChange={setQ}
        onSelect={(n) => go(`/law/${encodeURIComponent(n)}`)}
        onEnter={search}
        label="법령명 또는 키워드"
        placeholder="법령명 또는 키워드 (예: 형법, ㅎㅂ)"
        autoFocus
        className="min-w-0 flex-1"
        inputClassName="w-full rounded-lg border border-white/30 bg-white px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/60"
      />
      <button type="submit" className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-red-600">
        검색
      </button>
    </form>
  );
}
