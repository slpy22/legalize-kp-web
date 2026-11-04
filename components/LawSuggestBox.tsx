"use client";

import Link from "next/link";
import { objectParticle, othersLead, sharedReason, shownReason, type NameSuggestion } from "@/lib/versionMiss";

export interface LawSuggestions {
  strong: NameSuggestion | null;
  others: NameSuggestion[];
}

/**
 * T97·T98·T100: 이름이 맞는 법령이 없을 때 '혹시 이 법령?' 제안(이유 표시, 확실한 1개만 굵게). 자동 이동은 하지 않는다.
 * - kind="miss"   : 없는 법령 주소(404) — 후보는 법령 화면 링크
 * - kind="search" : 검색 화면 결과 위 — 후보는 법령 화면 링크, 앞말 '찾으시는 법령이 혹시 …'
 * - kind="pick"   : 신구비교 법령 입력 — 후보는 버튼, 누르면 onPick(이름)으로 입력이 바뀐다
 */
export default function LawSuggestBox({
  sugg,
  kind,
  onPick,
  className = "",
}: {
  sugg: LawSuggestions | null;
  kind: "miss" | "search" | "pick";
  onPick?: (name: string) => void;
  className?: string;
}) {
  if (!sugg || (!sugg.strong && sugg.others.length === 0)) return null;
  const { strong, others } = sugg;
  const pick = kind === "pick" && !!onPick;

  const item = (name: string, cls: string) =>
    pick ? (
      <button type="button" onClick={() => onPick?.(name)} className={`${cls} cursor-pointer`} title={`법령명 입력을 「${name}」(으)로 바꿉니다`}>
        「{name}」
      </button>
    ) : (
      <Link prefetch={false} href={`/law/${encodeURIComponent(name)}`} className={cls}>
        「{name}」
      </Link>
    );

  const generic = kind === "search" ? "찾으시는 법령이 혹시 이 가운데 있나요? " : undefined;
  const shared = sharedReason(others);

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-800 ${className}`} role="status">
      {strong && (
        <p className="text-base">
          {kind === "search" ? (
            <>찾으시는 법령이 혹시 {item(strong.name, "font-bold text-navy-light underline hover:text-navy")}인가요?</>
          ) : (
            <>
              혹시 {item(strong.name, "font-bold text-navy-light underline hover:text-navy")}
              {objectParticle(strong.name)} 찾으셨나요?
            </>
          )}
          {shownReason(strong) && <span className="ml-1 text-sm text-gray-500">({shownReason(strong)})</span>}
        </p>
      )}
      {others.length > 0 && (
        <p className={strong ? "mt-2 text-gray-600" : undefined}>
          {othersLead(strong, others, generic)}
          {others.map((c, i) => (
            <span key={c.name}>
              {i > 0 && " · "}
              {item(c.name, "font-medium text-navy-light underline hover:text-navy")}
              {/* T98: 옛이름·남한 대응·관련 있을 수 있음 — 왜 이 법령을 권하는지(모두 같으면 앞말에 한 번만) */}
              {shownReason(c) && !shared && <span className="text-xs text-gray-500"> ({shownReason(c)})</span>}
            </span>
          ))}
        </p>
      )}
      {pick && <p className="mt-1 text-xs text-gray-500">누르면 법령명 입력이 그 법령으로 바뀌고 판본을 불러옵니다.</p>}
    </div>
  );
}
