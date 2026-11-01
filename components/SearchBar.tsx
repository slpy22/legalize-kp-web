"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import LawNameInput from "@/components/LawNameInput";

const MODES = [
  { value: "keyword", label: "키워드" },
  { value: "semantic", label: "시맨틱" },
  { value: "hybrid", label: "하이브리드" },
] as const;

interface Props {
  size?: "large" | "normal";
  initialQuery?: string;
  initialMode?: string;
}

export default function SearchBar({
  size = "normal",
  initialQuery = "",
  initialMode = "hybrid",
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState(initialMode || "hybrid");

  const search = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}&mode=${mode}`);
  };
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    search();
  };

  const isLarge = size === "large";

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {/* 검색 입력 + 버튼 */}
      <div className="flex gap-2">
        {/* T50: 법령명 자동완성 — 후보를 고르면 그 법령으로, 그냥 Enter 면 키워드 검색 */}
        <LawNameInput
          value={query}
          onChange={setQuery}
          onSelect={(n) => router.push(`/law/${encodeURIComponent(n)}`)}
          onEnter={search}
          label="법령명 또는 키워드"
          placeholder="법령명 또는 키워드를 입력하세요"
          className="min-w-0 flex-1"
          inputClassName={`w-full rounded-lg border border-gray-300 bg-white text-gray-900 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30 ${
            isLarge ? "px-4 py-3 text-base sm:px-5 sm:py-3.5 sm:text-lg" : "px-4 py-2.5 text-base"
          }`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-lg bg-accent font-semibold text-white transition-colors hover:bg-red-600 ${
            isLarge ? "px-6 py-3 text-base sm:px-8 sm:py-3.5 sm:text-lg" : "px-6 py-2.5 text-base"
          }`}
        >
          검색
        </button>
      </div>

      {/* 검색 모드 라디오 */}
      <div className={`flex gap-4 ${isLarge ? "mt-3" : "mt-2"}`}>
        {MODES.map(({ value, label }) => (
          <label
            key={value}
            className={`flex cursor-pointer items-center gap-1.5 text-sm ${
              isLarge ? "text-white/90" : "text-gray-600"
            }`}
          >
            <input
              type="radio"
              name="search-mode"
              value={value}
              checked={mode === value}
              onChange={() => setMode(value)}
              className="accent-accent"
            />
            {label}
          </label>
        ))}
      </div>
    </form>
  );
}
