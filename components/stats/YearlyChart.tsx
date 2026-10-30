"use client";

import { useMemo, useState } from "react";
import type { YearRow } from "@/lib/lawStats";

/**
 * 연도별 건수 막대그래프(T42 통계). 라이브러리 없이 HTML 막대로 그린다(차트 라이브러리를 들이지 않아 가볍다).
 * 한 번에 한 계열만 그리고(탭으로 바꿈) 제목이 계열 이름을 말하므로 범례는 두지 않는다.
 * 막대마다 마우스·키보드 초점에 말풍선, 최댓값에만 숫자, 아래에 표 보기.
 */
type SeriesKey = "enacted" | "amended" | "versions" | "repealed";

const SERIES: { key: SeriesKey; label: string; desc: string }[] = [
  { key: "amended", label: "개정", desc: "수정·수정보충 등 개정 기록(원문 미확보 개정 포함)" },
  { key: "enacted", label: "제정", desc: "법령 채택(제정) 연도" },
  { key: "versions", label: "판본", desc: "본문을 보유한 판본의 날짜" },
  { key: "repealed", label: "폐지", desc: "폐지 기록" },
];

const BAR = "#2b6cb0"; // navy-light — 흰 바탕 대비 검증(dataviz validator PASS)

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}

export default function YearlyChart({ rows }: { rows: YearRow[] }) {
  const series = SERIES.filter((s) => s.key !== "repealed" || rows.some((r) => r.repealed > 0));
  const [key, setKey] = useState<SeriesKey>("amended");
  const [recent, setRecent] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  // 빈 해는 0 으로 채운다(막대 간격이 시간 간격과 같게)
  const filled = useMemo(() => {
    const active = rows.filter((r) => r.enacted + r.amended + r.versions + r.repealed > 0);
    if (active.length === 0) return [];
    const last = active[active.length - 1].year;
    const first = recent ? last - 29 : active[0].year;
    const byYear = new Map(rows.map((r) => [r.year, r]));
    const out: YearRow[] = [];
    for (let y = first; y <= last; y++) out.push(byYear.get(y) ?? { year: y, enacted: 0, amended: 0, repealed: 0, versions: 0 });
    return out;
  }, [rows, recent]);

  const cur = series.find((s) => s.key === key) ?? series[0];
  const values = filled.map((r) => r[cur.key]);
  const max = Math.max(0, ...values);
  const top = niceMax(max);
  const ticks = [0, top / 2, top];
  const maxIdx = values.indexOf(max);
  const total = values.reduce((a, b) => a + b, 0);

  if (filled.length === 0) return <p className="text-sm text-gray-500">표시할 연도별 데이터가 없습니다.</p>;

  return (
    <div>
      {/* 컨트롤: 계열 탭 + 기간 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="계열" className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          {series.map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={s.key === cur.key}
              onClick={() => setKey(s.key)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${s.key === cur.key ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
          {[
            { v: false, label: "전체 기간" },
            { v: true, label: "최근 30년" },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => setRecent(o.v)}
              aria-pressed={recent === o.v}
              className={`rounded-md px-3 py-1.5 transition-colors ${recent === o.v ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 text-sm text-gray-600">
        <strong className="text-gray-900">연도별 {cur.label} 건수</strong> · {filled[0].year}–{filled[filled.length - 1].year}년 합계{" "}
        <strong className="tabular-nums text-gray-900">{total.toLocaleString()}</strong>건
        <span className="ml-1 text-xs text-gray-400">({cur.desc})</span>
      </p>

      {/* 그래프 */}
      <div className="pl-8 pt-3">
        <div className="relative">
        {/* 눈금·격자(옅게) — 막대 영역에만 맞춘다 */}
        <div className="pointer-events-none absolute inset-y-0 -left-8 right-0" aria-hidden>
          {ticks.map((t) => (
            <div key={t} className="absolute left-0 right-0 flex translate-y-1/2 items-center" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="w-8 pr-1.5 text-right text-[11px] tabular-nums text-gray-400">{t}</span>
              <span className="h-px flex-1 bg-gray-100" />
            </div>
          ))}
        </div>
        <div className="relative flex h-56 items-end gap-[2px]" role="img" aria-label={`연도별 ${cur.label} 건수 막대그래프. 자세한 값은 아래 표 보기.`}>
          {filled.map((r, i) => {
            const v = r[cur.key];
            const h = top ? (v / top) * 100 : 0;
            const on = hover === i;
            return (
              <button
                key={r.year}
                type="button"
                className="group relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${r.year}년 ${cur.label} ${v}건`}
              >
                <span
                  className="block w-full max-w-[24px] rounded-t-[4px] transition-opacity"
                  style={{ height: `${h}%`, minHeight: v > 0 ? 2 : 0, background: BAR, opacity: hover === null || on ? 1 : 0.45 }}
                />
                {i === maxIdx && max > 0 && !on && (
                  <span className="pointer-events-none absolute -translate-y-1 whitespace-nowrap text-[11px] font-semibold tabular-nums text-gray-700" style={{ bottom: `${h}%` }}>
                    {r.year}년 {v}
                  </span>
                )}
                {on && (
                  <span
                    className="pointer-events-none absolute z-10 mb-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow"
                    style={{ bottom: `${Math.min(h, 85)}%`, left: i > filled.length * 0.7 ? "auto" : "50%", right: i > filled.length * 0.7 ? 0 : "auto", transform: i > filled.length * 0.7 ? "none" : "translateX(-50%)" }}
                  >
                    {r.year}년 · {cur.label} <strong className="tabular-nums">{v}</strong>건
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </div>
        {/* 연도 축: 10년마다 */}
        <div className="mt-1 flex gap-[2px] text-[11px] text-gray-400" aria-hidden>
          {filled.map((r) => (
            <span key={r.year} className="relative min-w-0 flex-1">
              {r.year % 10 === 0 && <span className="absolute left-1/2 -translate-x-1/2 tabular-nums">{r.year}</span>}
            </span>
          ))}
        </div>
      </div>

      {/* 표 보기 */}
      <details className="mt-8 rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700">표로 보기</summary>
        <div className="max-h-80 overflow-auto px-4 pb-3">
          <table className="w-full text-right text-sm tabular-nums">
            <thead className="sticky top-0 bg-white text-xs text-gray-500">
              <tr>
                <th className="py-1 text-left font-medium">연도</th>
                {series.map((s) => (
                  <th key={s.key} className="py-1 font-medium">{s.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filled].reverse().map((r) => (
                <tr key={r.year} className="border-t border-gray-100">
                  <td className="py-1 text-left">{r.year}</td>
                  {series.map((s) => (
                    <td key={s.key} className="py-1">{r[s.key] || ""}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
