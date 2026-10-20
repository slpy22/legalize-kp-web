"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Article } from "@/lib/types";

interface Props {
  articles: Article[];
}

/**
 * 조문 키 → 표기 (T4/T7 키 규약)
 *  '12'    → '제12조'
 *  '부칙3' → '부칙 제3조'   (부칙 블록의 조문, 본칙과 번호 충돌 방지용 접두)
 *  '서문1' → '서문 제1조'
 *  '항5'   → '5.'           (조문 번호가 없는 법령의 'N. 머리글' 항목)
 * 항목(N.)은 제목을 괄호 없이 이어 쓴다.
 */
export function formatArticleHeading(num: string | number, title?: string | null): string {
  const s = String(num);
  const t = (title ?? "").trim();
  let m = /^부칙(\d+)$/.exec(s);
  if (m) return `부칙 제${m[1]}조${t ? ` (${t})` : ""}`;
  m = /^서문(\d+)$/.exec(s);
  if (m) return `서문 제${m[1]}조${t ? ` (${t})` : ""}`;
  m = /^항(\d+)$/.exec(s);
  if (m) return `${m[1]}.${t ? ` ${t}` : ""}`;
  const base = /^\d+$/.test(s) ? `제${s}조` : s;
  return `${base}${t ? ` (${t})` : ""}`;
}

export default function ArticleView({ articles }: Props) {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");
  const highlightRef = useRef<HTMLDivElement>(null);
  let currentChapter = "";

  // 하이라이트 조문으로 스크롤 (hash 또는 highlight param)
  useEffect(() => {
    const target = highlightRef.current
      || (window.location.hash && document.querySelector(window.location.hash));
    if (target) {
      setTimeout(() => {
        (target as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
      }, 500);
    }
  }, [highlight]);

  return (
    <div className="law-content">
      {articles.map((art) => {
        const showChapterHeading =
          art.chapter && art.chapter !== currentChapter;
        if (art.chapter) currentChapter = art.chapter;
        const isHighlighted = highlight === String(art.article_number);

        return (
          <div
            key={art.id}
            id={`article-${art.article_number}`}
            ref={isHighlighted ? highlightRef : undefined}
            style={isHighlighted ? {
              background: "#fef9c3",
              borderLeft: "4px solid #eab308",
              paddingLeft: 12,
              marginLeft: -16,
              borderRadius: 4,
              transition: "background 2s ease",
            } : undefined}
          >
            {showChapterHeading && (
              <h2 id={`chapter-${art.chapter}`}>{art.chapter}</h2>
            )}
            <h5>{formatArticleHeading(art.article_number, art.article_title)}</h5>
            <p className="whitespace-pre-wrap">{art.content}</p>
          </div>
        );
      })}
    </div>
  );
}
