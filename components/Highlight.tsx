import React from "react";

interface HighlightProps {
  text: string;
  query: string;
  className?: string;
}

/**
 * 텍스트 내 검색어(공백 구분 단어)를 <mark>로 하이라이트.
 * query가 비어있으면 원본 텍스트 그대로 반환.
 */
export default function Highlight({ text, query, className }: HighlightProps) {
  if (!query || !text) {
    return <span className={className}>{text}</span>;
  }

  // 검색어를 공백 기준 단어로 분리, 빈 문자열 제거
  const words = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const pattern = new RegExp(`(${words.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="rounded-sm bg-yellow-200 px-0.5">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}
