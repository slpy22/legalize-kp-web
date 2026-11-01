import Link from "next/link";
import type { CenterTracked } from "@/lib/types";

/**
 * 센터 추적 개정 이력(T47) — 공식 공개 이력과 구분해, 센터가 북한 매체·학보 논문 등으로 추적한 개정을 근거와 함께 보인다.
 * 항목마다 앵커(#ct-<id>)가 있어 개정이력 타임라인의 '센터 추적 근거' 배지가 여기로 온다.
 */
export function trackedAnchor(t: CenterTracked, i: number): string {
  return `ct-${t.id || i}`;
}

/** 날짜이견 항목의 공식 원문 일자(official_note 의 첫 YYYY-MM-DD) — 타임라인의 그 행에도 배지를 잇는다 */
export function officialDate(t: CenterTracked): string | null {
  if (t.kind !== "날짜이견" || !t.official_note) return null;
  return t.official_note.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null;
}

/** T48 은 원문 쪽 값을 '원문값 2022-08-07 …' 처럼 적는다 — 화면에서는 '공식 원문 일자 2022-08-07 …'로 */
function officialNoteText(note: string): string {
  return note.startsWith("원문값") ? `공식 원문 일자 ${note.slice(3).trim()}` : `공식 원문: ${note}`;
}

export default function CenterTrackedList({ items }: { items: CenterTracked[] }) {
  return (
    <section className="mt-12" aria-labelledby="center-tracked">
      <h2 id="center-tracked" className="text-xl font-bold text-gray-800">
        센터 추적 이력 <span className="ml-1 align-middle text-sm font-normal text-gray-500">{items.length}건</span>
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        공식 공개 자료에 없거나 일자가 다른 개정을 센터가 로동신문 등 북한 매체와 북한 법학 논문(김일성종합대학 학보 등)으로 추적한 기록입니다.
        근거 자료를 함께 밝히며, 확실성을 <strong>확인</strong>·<strong>추정</strong>으로 나눕니다.{" "}
        <Link href="/about/data" className="text-navy-light hover:underline">데이터와 권리 안내</Link>
      </p>
      {items.length === 0 ? (
        <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">이 법령에는 센터가 따로 추적한 개정 이력이 없습니다.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((t, i) => (
            <li key={trackedAnchor(t, i)} id={trackedAnchor(t, i)} className="scroll-mt-20 rounded-lg border border-violet-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">{t.date}</span>
                <span className="rounded-full bg-violet-600 px-2 py-0.5 text-xs font-medium text-white">센터 추적</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{t.action}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.certainty === "확인" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {t.certainty}
                </span>
                {t.kind === "날짜이견" && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800">날짜 이견</span>
                )}
                {t.needs_check && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">확인 중</span>}
                {t.in_official && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">공식 출처에도 있음</span>}
                {t.decree && <span className="text-xs text-gray-500">{t.decree}</span>}
              </div>
              <p className="mt-2 text-sm text-gray-800">{t.summary}</p>
              {t.official_note && (t.kind === "날짜이견" || t.in_official) && (
                <p className="mt-1 text-xs text-gray-500">
                  {t.kind === "날짜이견" ? officialNoteText(t.official_note) : `공식 출처: ${t.official_note}`}
                </p>
              )}
              <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
                {t.evidence.map((e, j) => {
                  const label = [e.type, e.title, e.author, e.issue, e.date, e.page].filter(Boolean).join(" · ");
                  return (
                    <li key={j}>
                      <span className="font-medium text-gray-700">근거</span>{" "}
                      {e.url ? (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-navy-light hover:underline">{label}</a>
                      ) : (
                        label
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
