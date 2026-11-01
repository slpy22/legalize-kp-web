import Link from "next/link";
import type { TextStatus } from "@/lib/types";

/**
 * 본문 미확보 법령 안내(T54) — 원문을 확보하지 못한 법령은 조문 대신 알려진 근거·확실성을 보인다.
 * 법령 페이지(전체)와 개정이력 페이지(compact)에서 쓴다. 다른 판본 조문을 끌어와 본문을 지어내지 않는다.
 */
const CERTAINTY_HELP: Record<string, string> = {
  확인: "법령이 있고 채택됐다는 사실이 북한 매체 보도 등으로 확인됨",
  추정: "논문 인용 등 간접 근거로 있다고 보이나 확인되지 않음",
};
const BASIS_HELP: Record<string, string> = { 강: "공식 보도·정령 등 직접 근거", 중: "논문·해설 등 간접 근거", 약: "단편적 언급" };

export default function UnavailableNotice({ text, lawName, compact = false }: { text: TextStatus; lawName: string; compact?: boolean }) {
  if (text.available) return null;
  return (
    <section aria-labelledby="unavailable" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-gray-800">
      <h2 id="unavailable" className="text-base font-bold text-amber-900">
        본문 미확보{text.state && text.state !== "미확보" ? ` · ${text.state}` : ""}
      </h2>
      <p className="mt-1 text-amber-900">
        원문을 확보하지 못한 법령입니다. 조문은 없고, 센터가 북한 매체·법학 논문으로 추적한 개정 이력과 근거 자료만 보입니다.
      </p>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-gray-500">확실성</dt>
          <dd className="font-medium" title={text.certainty ? CERTAINTY_HELP[text.certainty] : undefined}>
            {text.certainty ?? "미상"}
            {text.certainty && CERTAINTY_HELP[text.certainty] && <span className="ml-1 text-xs font-normal text-gray-500">— {CERTAINTY_HELP[text.certainty]}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">실존 근거</dt>
          <dd className="font-medium">
            {text.existence_basis ?? "미상"}
            {text.existence_basis && BASIS_HELP[text.existence_basis] && <span className="ml-1 text-xs font-normal text-gray-500">— {BASIS_HELP[text.existence_basis]}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">법령 명칭</dt>
          <dd className="font-medium">{text.name_confirmed === false ? "국문 명칭 미확인(외국어 보도 등에서 옮김)" : "확인"}</dd>
        </div>
      </dl>
      {!compact && text.evidence && text.evidence.length > 0 && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold text-gray-600">근거 자료</h3>
          <ul className="mt-1 space-y-0.5 text-xs text-gray-700">
            {text.evidence.map((e, i) => {
              const label = [e.type, e.title, e.author, e.issue, e.date, e.page].filter(Boolean).join(" · ");
              return (
                <li key={i}>
                  {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-navy-light hover:underline">{label}</a> : label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {!compact && text.same_law_review && (
        <p className="mt-3 text-xs text-gray-600">
          <span className="font-semibold">비슷한 법령 검토</span> — {String(text.same_law_review["대상"] ?? "")}:{" "}
          {String(text.same_law_review["판단"] ?? "")}
          {text.same_law_review["근거"] ? ` (${String(text.same_law_review["근거"])})` : ""}
        </p>
      )}
      {!compact && (
        <p className="mt-3">
          <Link href={`/law/${encodeURIComponent(lawName)}/history`} className="font-semibold text-navy-light hover:underline">
            알려진 개정 이력 보기 →
          </Link>
        </p>
      )}
    </section>
  );
}
