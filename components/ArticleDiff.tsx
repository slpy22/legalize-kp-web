"use client";

import { diffWordsWithSpace } from "diff";
import { useMemo } from "react";
import type { Article } from "@/lib/types";

interface Props {
  /** 같은 article_number 기준으로 짝지어진 from/to. 둘 중 하나만 있을 수 있음 (신규/삭제). */
  from?: Article | null;
  to?: Article | null;
}

type DiffKind = "added" | "removed" | "modified";

function kindOf(from?: Article | null, to?: Article | null): DiffKind {
  if (!from && to) return "added";
  if (from && !to) return "removed";
  return "modified";
}

const KIND_LABEL: Record<DiffKind, string> = {
  added: "신설",
  removed: "삭제",
  modified: "변경",
};

const KIND_STYLE: Record<DiffKind, string> = {
  added: "bg-emerald-100 text-emerald-800 border-emerald-300",
  removed: "bg-rose-100 text-rose-800 border-rose-300",
  modified: "bg-amber-100 text-amber-800 border-amber-300",
};

export default function ArticleDiff({ from, to }: Props) {
  const kind = kindOf(from, to);
  const article_number = (to ?? from)?.article_number ?? "?";
  const title = (to ?? from)?.article_title ?? "";

  const segments = useMemo(() => {
    if (kind === "added") {
      return [{ added: true, removed: false, value: to?.content ?? "" }];
    }
    if (kind === "removed") {
      return [{ added: false, removed: true, value: from?.content ?? "" }];
    }
    return diffWordsWithSpace(from?.content ?? "", to?.content ?? "");
  }, [from, to, kind]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${KIND_STYLE[kind]}`}
        >
          {KIND_LABEL[kind]}
        </span>
        <h4 className="text-sm font-semibold text-gray-800">
          제{article_number}조{title ? ` (${title})` : ""}
        </h4>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {segments.map((seg, i) => {
          if (seg.added) {
            return (
              <span
                key={i}
                className="rounded bg-emerald-100 px-0.5 text-emerald-900"
              >
                {seg.value}
              </span>
            );
          }
          if (seg.removed) {
            return (
              <span
                key={i}
                className="rounded bg-rose-100 px-0.5 text-rose-900 line-through decoration-rose-400"
              >
                {seg.value}
              </span>
            );
          }
          return <span key={i}>{seg.value}</span>;
        })}
      </p>
    </div>
  );
}
