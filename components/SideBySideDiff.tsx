"use client";

import { diffWords } from "diff";
import { useMemo } from "react";
import type { SemanticDiffPair } from "@/lib/types";

interface Props {
  pair: SemanticDiffPair;
}

const KIND_LABEL: Record<string, string> = {
  added: "신설",
  removed: "삭제",
  modified: "변경",
  same: "동일",
};

const KIND_BADGE: Record<string, string> = {
  added: "bg-emerald-100 text-emerald-800 border-emerald-300",
  removed: "bg-rose-100 text-rose-800 border-rose-300",
  modified: "bg-amber-100 text-amber-800 border-amber-300",
  same: "bg-gray-100 text-gray-600 border-gray-300",
};

/**
 * 좌(구) | 우(신) side-by-side 조문 비교.
 * - modified: 양쪽 본문을 단어 단위 diff. 좌측엔 삭제 단어(적색), 우측엔 추가 단어(녹색) 강조.
 * - added: 우측만 (전체 녹색), 좌측은 빈 칸.
 * - removed: 좌측만 (전체 적색), 우측은 빈 칸.
 * - same: 양쪽 동일 본문 (강조 없음).
 */
export default function SideBySideDiff({ pair }: Props) {
  const { kind, similarity } = pair;
  const from = pair.from;
  const to = pair.to;

  const fromContent = from?.content ?? "";
  const toContent = to?.content ?? "";

  // 단어 단위 diff segments (modified 일 때만 의미 있음).
  // diffWords 는 공백 정도의 차이(스페이스/줄바꿈 수)는 무시하고 단어 변화만 잡는다.
  const segments = useMemo(() => {
    if (kind !== "modified") return null;
    return diffWords(fromContent, toContent);
  }, [kind, fromContent, toContent]);

  // 좌측: common + removed 만 렌더 (added 는 제외)
  const leftNodes = useMemo(() => {
    if (!segments) return null;
    return segments.map((seg, i) => {
      if (seg.added) return null;
      if (seg.removed) {
        return (
          <span key={i} className="rounded bg-rose-200/70 px-0.5 text-rose-900">
            {seg.value}
          </span>
        );
      }
      return <span key={i}>{seg.value}</span>;
    });
  }, [segments]);

  // 우측: common + added 만 렌더 (removed 는 제외)
  const rightNodes = useMemo(() => {
    if (!segments) return null;
    return segments.map((seg, i) => {
      if (seg.removed) return null;
      if (seg.added) {
        return (
          <span key={i} className="rounded bg-emerald-200/70 px-0.5 text-emerald-900">
            {seg.value}
          </span>
        );
      }
      return <span key={i}>{seg.value}</span>;
    });
  }, [segments]);

  const fromNum = from?.article_number;
  const toNum = to?.article_number;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${KIND_BADGE[kind]}`}>
          {KIND_LABEL[kind]}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {fromNum && toNum && fromNum !== toNum
            ? `제${fromNum}조 → 제${toNum}조`
            : `제${toNum ?? fromNum}조`}
        </span>
        {(to?.article_title || from?.article_title) && (
          <span className="text-xs text-gray-500">
            ({to?.article_title || from?.article_title})
          </span>
        )}
        {similarity != null && (
          <span
            className="ml-auto text-xs text-gray-400"
            title="의미 유사도 (1.0 = 동일 의미)"
          >
            유사도 {(similarity * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {/* 좌우 본문 */}
      <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* 좌 (구) */}
        <div className="p-4">
          <div className="mb-1 text-xs font-semibold text-gray-400">이전</div>
          {kind === "added" ? (
            <p className="text-sm italic text-gray-300">— (해당 조문 없음)</p>
          ) : kind === "removed" ? (
            <p className="whitespace-pre-wrap rounded bg-rose-50 px-1 text-sm leading-relaxed text-rose-900">
              {fromContent}
            </p>
          ) : kind === "modified" ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {leftNodes}
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {fromContent}
            </p>
          )}
        </div>

        {/* 우 (신) */}
        <div className="p-4">
          <div className="mb-1 text-xs font-semibold text-gray-400">현재/신본</div>
          {kind === "removed" ? (
            <p className="text-sm italic text-gray-300">— (해당 조문 없음)</p>
          ) : kind === "added" ? (
            <p className="whitespace-pre-wrap rounded bg-emerald-50 px-1 text-sm leading-relaxed text-emerald-900">
              {toContent}
            </p>
          ) : kind === "modified" ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {rightNodes}
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {toContent}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
