"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Article } from "@/lib/types";

interface Props {
  articles: Article[];
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
            <h5>
              제{art.article_number}조
              {art.article_title ? ` (${art.article_title})` : ""}
            </h5>
            <p className="whitespace-pre-wrap">{art.content}</p>
          </div>
        );
      })}
    </div>
  );
}
