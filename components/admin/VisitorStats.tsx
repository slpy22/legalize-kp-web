"use client";

import { useMemo, useState } from "react";
import type { AdminVisitors } from "@/lib/account";

/**
 * 관리자 방문자 수·접속 국가·봇(T52). 집계만 보인다.
 * 색: dataviz 기준 범주 1~3(검증 통과 — 청록은 바탕 대비가 3:1 아래라 범례·표로 보기를 함께 둔다).
 * 주·월: 쿠키 방문자는 기간 안 중복 없는 정확한 수, '쿠키 없이 집계'는 일별 합(근사)이라 화면에 그렇게 적는다.
 */
const SERIES = [
  { key: "member", label: "회원", color: "#2a78d6" },
  { key: "guest", label: "비회원(방문자 쿠키)", color: "#eb6834" },
  { key: "cookieless", label: "쿠키 없이 집계(GPC·거부)", color: "#1baf7a" },
] as const;

type Unit = "day" | "week" | "month";

function countryName(cc: string): string {
  if (cc === "??") return "알 수 없음";
  try {
    return new Intl.DisplayNames(["ko"], { type: "region" }).of(cc) || cc;
  } catch {
    return cc;
  }
}

export default function VisitorStats({ v, days, geoip }: {
  v: AdminVisitors;
  days: number;
  geoip?: { available: boolean; attribution: string; attribution_url: string };
}) {
  const [unit, setUnit] = useState<Unit>("day");
  const [hover, setHover] = useState<number | null>(null);
  const [now] = useState(() => Date.now());   // 그릴 때마다 바뀌지 않게 처음 한 번만

  // 일별: 빈 날은 0. 주·월: 쿠키 방문자(정확) 위에 쿠키 없이 집계(일별 합, 근사)
  const bars = useMemo(() => {
    if (unit === "day") {
      const by = new Map(v.daily.map((d) => [d.day, d]));
      const out = [];
      const end = now + 9 * 3600000;
      for (let i = days - 1; i >= 0; i--) {
        const day = new Date(end - i * 86400000).toISOString().slice(0, 10);
        const d = by.get(day);
        out.push({ label: day, parts: [d?.member ?? 0, d?.guest ?? 0, d?.cookieless ?? 0], extra: d ? `신규 ${d.new} · 재방문 ${d.returning}` : "" });
      }
      return out;
    }
    const rows = unit === "week" ? v.weekly : v.monthly;
    return rows.map((r) => ({
      label: unit === "week" ? `${r.start} 주` : r.start.slice(0, 7),
      parts: [r.member_unique, Math.max(0, r.cookie_unique - r.member_unique), r.cookieless_daysum],
      extra: "쿠키 없이 집계는 일별 합(근사)",
    }));
  }, [v, unit, days, now]);
  const max = Math.max(1, ...bars.map((b) => b.parts[0] + b.parts[1] + b.parts[2]));

  const sum = (k: "total" | "new" | "returning") => v.daily.reduce((a, d) => a + d[k], 0);
  const today = v.daily[v.daily.length - 1];
  const newN = sum("new"), retN = sum("returning");

  return (
    <section aria-labelledby="visitors" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="visitors" className="text-lg font-bold text-gray-800">방문자 수</h2>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm" role="tablist" aria-label="방문자 단위">
          {([["day", "일별"], ["week", "주별"], ["month", "월별"]] as [Unit, string][]).map(([u, l]) => (
            <button key={u} role="tab" aria-selected={unit === u} onClick={() => setUnit(u)}
              className={`rounded-md px-3 py-1.5 ${unit === u ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "오늘 순방문자", value: today?.total ?? 0 },
          { label: `일별 순방문자 합(${days}일)`, value: sum("total") },
          { label: `신규 방문(${days}일)`, value: newN },
          { label: "재방문율", value: newN + retN ? `${Math.round((retN / (newN + retN)) * 100)}%` : "–" },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <dt className="text-xs text-gray-500">{t.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-navy">{typeof t.value === "number" ? t.value.toLocaleString() : t.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600" aria-label="범례">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
        <div className="relative flex h-44 items-end gap-[2px]" role="img"
          aria-label={`${unit === "day" ? "일별" : unit === "week" ? "주별" : "월별"} 순방문자 — 회원·비회원·쿠키 없이 집계`}>
          {bars.map((b, i) => {
            const total = b.parts[0] + b.parts[1] + b.parts[2];
            return (
              <button key={b.label} type="button" className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                aria-label={`${b.label} 합계 ${total}명`}>
                <span className="flex w-full max-w-[28px] flex-col-reverse gap-[2px]" style={{ height: `${(total / max) * 100}%`, opacity: hover === null || hover === i ? 1 : 0.45 }}>
                  {b.parts.map((n, j) => n > 0 && (
                    <span key={j} className={j === b.parts.findLastIndex((x) => x > 0) ? "rounded-t-[4px]" : ""}
                      style={{ flexGrow: n, minHeight: 2, background: SERIES[j].color }} />
                  ))}
                </span>
                {hover === i && (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-left text-xs text-white">
                    {b.label} · 합계 <strong>{total}</strong>
                    <br />회원 {b.parts[0]} · 비회원 {b.parts[1]} · 쿠키 없이 {b.parts[2]}
                    {b.extra && <><br />{b.extra}</>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
          <span>{bars[0]?.label}</span>
          <span>{bars[bars.length - 1]?.label}</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {unit === "day"
            ? "일별은 그날의 순방문자입니다(방문자 쿠키 ID 또는 그날의 해시 하나당 한 명)."
            : "주·월의 회원·비회원은 방문자 쿠키로 센 기간 안 순방문자(정확)이고, '쿠키 없이 집계'는 날마다 센 수의 합(근사 — 같은 사람이 여러 날 오면 여러 번)입니다."}
        </p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-navy-light">표로 보기</summary>
          <table className="mt-2 w-full text-xs tabular-nums">
            <thead><tr className="text-left text-gray-500"><th className="py-1">기간</th>{SERIES.map((s) => <th key={s.key} className="py-1 text-right">{s.label}</th>)}<th className="py-1 text-right">합계</th></tr></thead>
            <tbody>
              {bars.filter((b) => b.parts.some((x) => x > 0)).map((b) => (
                <tr key={b.label} className="border-t border-gray-100">
                  <td className="py-1">{b.label}</td>
                  {b.parts.map((n, j) => <td key={j} className="py-1 text-right">{n}</td>)}
                  <td className="py-1 text-right font-semibold">{b.parts[0] + b.parts[1] + b.parts[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">접속 국가({days}일)</h2>
          <table className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr><th className="px-4 py-2 text-left">국가</th><th className="px-4 py-2 text-right">방문자(일별 합)</th><th className="px-4 py-2 text-right">페이지·법령 조회</th></tr>
            </thead>
            <tbody>
              {v.countries.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</td></tr>}
              {v.countries.map((c) => (
                <tr key={c.country} className="border-t border-gray-100">
                  <td className="px-4 py-2">{countryName(c.country)} <span className="text-xs text-gray-400">{c.country !== "??" ? c.country : ""}</span></td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.visitors.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.views.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-400">
            국가는 서버 안의 국가 판별 자료로 코드만 남기고 IP 는 버립니다.{" "}
            {geoip?.available === false && "국가 판별 자료가 아직 없어 '알 수 없음'으로 셉니다. "}
            {geoip && <a href={geoip.attribution_url} target="_blank" rel="noopener noreferrer" className="underline">{geoip.attribution}</a>}
            {geoip && " (CC BY 4.0)"}
          </p>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">봇 요청({days}일) — 방문자 수에서 뺌</h2>
          <table className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr><th className="px-4 py-2 text-left">구분</th><th className="px-4 py-2 text-left">이름</th><th className="px-4 py-2 text-right">요청</th></tr>
            </thead>
            <tbody>
              {v.bots.length === 0 && <tr><td colSpan={3} className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</td></tr>}
              {v.bots.map((b) => (
                <tr key={`${b.kind}-${b.name}`} className="border-t border-gray-100">
                  <td className="px-4 py-2">{b.kind === "search_bot" ? "검색엔진(확인됨)" : b.kind === "renderer" ? "검색엔진 렌더러" : "수집 도구·사칭"}</td>
                  <td className="px-4 py-2">{b.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{b.hits.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-400">검색엔진은 역DNS 로 확인한 것만 &lsquo;확인됨&rsquo;으로, 이름만 흉내 낸 요청은 &lsquo;(사칭)&rsquo;으로 셉니다. &lsquo;렌더러&rsquo;는 사람 브라우저처럼 보이지만 접속 주소가 검색엔진 수집기로 확인된 요청입니다(사유별 건수는 아래 &lsquo;방문 분류 사유&rsquo;).</p>
          {/* T82: 내부 접속은 통계에 넣지 않고 건수만 */}
          <p className="mt-3 text-sm text-gray-700">
            내부 접속({days}일) — 이용 기록·방문자 수에서 뺌:{" "}
            <strong className="tabular-nums">
              {((v.internal?.lan ?? 0) + (v.internal?.admin ?? 0) + (v.internal?.device ?? 0) + (v.internal?.test ?? 0)).toLocaleString()}건
            </strong>
            <span className="text-gray-500">
              {" "}(내부망(LAN) {(v.internal?.lan ?? 0).toLocaleString()} · 관리자 계정 {(v.internal?.admin ?? 0).toLocaleString()}
              {" "}· 운영자 기기 {(v.internal?.device ?? 0).toLocaleString()} · 점검 접속 {(v.internal?.test ?? 0).toLocaleString()})
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            공유기 경유(사무실·확인 요청 등 내부망 주소), 관리자 계정으로 로그인한 접속, 집계 제외를 켠 운영자 브라우저(로그아웃 뒤에도),
            점검 헤더를 붙인 점검 접속입니다. 프록시·도커 경로(172.16~31.x·127.x)로 들어온 요청은
            원본 IP 를 잃은 바깥 방문자일 수 있어 그대로 셉니다.
          </p>
        </div>
      </div>
    </section>
  );
}
