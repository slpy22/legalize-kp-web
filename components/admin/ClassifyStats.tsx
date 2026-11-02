"use client";

import { useMemo, useState } from "react";
import type { AdminUsage, AdminVisitors } from "@/lib/account";

/**
 * T85: 방문 분류 사유별 건수 — 관리자 이용현황. 방문자 수·이용 기록에서 뺀 요청(검색엔진·렌더러·사칭·수집 도구·내부)과
 * 사람으로 세되 보조 신호가 있던 페이지 기록(의심)을 사유별로 보인다. 집계만 보인다(IP 는 저장하지 않음).
 * 판정 기준은 백엔드 app/usage/classify.py.
 */
type Group = "search" | "renderer" | "impostor" | "tool" | "suspicious" | "internal";

const GROUPS: { key: Group; label: string; counted: boolean; cls: string }[] = [
  { key: "search", label: "검색엔진(확인됨)", counted: false, cls: "bg-sky-50 text-sky-800" },
  { key: "renderer", label: "검색엔진 렌더러", counted: false, cls: "bg-violet-50 text-violet-800" },
  { key: "impostor", label: "사칭·확인 실패", counted: false, cls: "bg-rose-50 text-rose-800" },
  { key: "tool", label: "수집 도구", counted: false, cls: "bg-amber-50 text-amber-800" },
  { key: "suspicious", label: "의심(방문자에 포함)", counted: true, cls: "bg-gray-100 text-gray-700" },
  { key: "internal", label: "내부 접속", counted: false, cls: "bg-emerald-50 text-emerald-800" },
];

const ENGINE: Record<string, string> = {
  baidu: "바이두", google: "구글", bing: "빙", naver: "네이버", yandex: "얀덱스", daum: "다음", apple: "애플",
  sogou: "소우거우", petal: "페탈(화웨이)", amazon: "아마존",
};
const REASON: Record<string, string> = {
  headless: "헤드리스 브라우저 표지(sec-ch-ua)",
  old_chrome_first: "오래된 Chrome(110 미만) + 방문자 쿠키 없는 첫 요청",
  no_accept_language: "언어 헤더(Accept-Language) 없음",
  rdns_mismatch: "역DNS 는 수집기 이름인데 정방향 주소가 다름",
  lan: "내부망(LAN — 공유기 경유)",
  admin: "관리자 계정 로그인",
  device: "운영자 기기(이 브라우저 집계 제외)",
  test: "점검 접속(점검 헤더)",
};

type Row = { day: string; kind: string; name: string; hits: number };

/** bot_days 한 줄 → (묶음, 화면 이름) */
function groupOf(r: { kind: string; name: string }): [Group, string] {
  if (r.kind === "renderer") {
    const f = r.name.match(/^(.*)\(뒤따름\)$/);          // T88: 수집기 직후 같은 엔진 대역에서 온 렌더러 요청(역DNS 없음)
    return ["renderer", f ? `${ENGINE[f[1]] ?? f[1]}(수집 직후·역DNS 없음)` : ENGINE[r.name] ?? r.name];
  }
  if (r.kind === "search_bot") {
    const m = r.name.match(/^(.*)\(렌더러\)$/);          // 스키마 적용 전 대체 기록
    return m ? ["renderer", ENGINE[m[1]] ?? m[1]] : ["search", r.name];
  }
  if (r.kind === "suspicious") return ["suspicious", REASON[r.name] ?? r.name];
  if (r.kind === "internal") return ["internal", REASON[r.name] ?? r.name];
  if (/\((사칭|확인 실패)\)$/.test(r.name)) return ["impostor", r.name];
  return ["tool", r.name];
}

export default function ClassifyStats({ v, days, status }: {
  v: AdminVisitors;
  days: number;
  status?: AdminUsage["classifier"];
}) {
  const [now] = useState(() => Date.now());   // 그릴 때마다 바뀌지 않게 처음 한 번만
  const today = new Date(now + 9 * 3600000).toISOString().slice(0, 10);
  const rows: Row[] = useMemo(() => v.classes ?? [], [v.classes]);

  // 사유별: 오늘·기간 합
  const reasons = useMemo(() => {
    const m = new Map<string, { group: Group; label: string; today: number; total: number }>();
    for (const r of rows) {
      const [group, label] = groupOf(r);
      const k = `${group}|${label}`;
      const a = m.get(k) ?? { group, label, today: 0, total: 0 };
      a.total += r.hits;
      if (r.day === today) a.today += r.hits;
      m.set(k, a);
    }
    const order = GROUPS.map((g) => g.key);
    return [...m.values()].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.total - a.total);
  }, [rows, today]);

  // 일별: 날짜 × 묶음
  const byDay = useMemo(() => {
    const m = new Map<string, Record<Group, number>>();
    for (const r of rows) {
      const [group] = groupOf(r);
      const d = m.get(r.day) ?? { search: 0, renderer: 0, impostor: 0, tool: 0, suspicious: 0, internal: 0 };
      d[group] += r.hits;
      m.set(r.day, d);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [rows]);

  const badge = (g: Group) => {
    const x = GROUPS.find((y) => y.key === g)!;
    return <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] ${x.cls}`}>{x.label}</span>;
  };

  return (
    <section aria-labelledby="classify" className="mt-8">
      <h2 id="classify" className="text-lg font-bold text-gray-800">방문 분류 사유({days}일)</h2>
      <p className="mt-1 text-xs text-gray-500">
        &lsquo;의심&rsquo;만 방문자 수에 들어가고(보조 신호가 있었을 뿐 사람일 수 있음), 나머지는 방문자 수·이용 기록에서 뺀 요청입니다.
        검색엔진 렌더러는 사람 브라우저처럼 보이지만 접속 주소의 역DNS·정방향 확인 결과가 검색엔진 수집기인 경우입니다.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">구분</th>
              <th className="px-4 py-2 text-left">사유</th>
              <th className="px-4 py-2 text-right">오늘</th>
              <th className="px-4 py-2 text-right">{days}일 합</th>
            </tr>
          </thead>
          <tbody>
            {reasons.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</td></tr>}
            {reasons.map((r) => (
              <tr key={`${r.group}-${r.label}`} className="border-t border-gray-100">
                <td className="px-4 py-2">{badge(r.group)}</td>
                <td className="px-4 py-2">{r.label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.today.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.total.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {byDay.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-xs text-navy-light">일별로 보기</summary>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-xs tabular-nums">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-1.5 text-left">날짜</th>
                  {GROUPS.map((g) => <th key={g.key} className="px-3 py-1.5 text-right font-normal">{g.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {byDay.map(([day, d]) => (
                  <tr key={day} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{day}</td>
                    {GROUPS.map((g) => <td key={g.key} className="px-3 py-1.5 text-right">{d[g.key] ? d[g.key].toLocaleString() : "·"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {status?.enabled && status.resolver === "system" && status.ptr_ok === false && (
        <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>역DNS 확인 안 됨</strong> — 서버 안의 DNS 가 역DNS(PTR) 질의에 답하지 않습니다. 그동안 검색엔진은 &lsquo;(확인 실패)&rsquo;로,
          렌더러는 가려내지 못해 사람으로 셉니다. 백엔드 환경 변수 <code>NKLAW_RDNS_SERVERS</code> 에 역DNS 를 푸는 DNS 서버 주소를 주면 됩니다.
        </div>
      )}
      {status && (
        <p className="mt-2 text-xs text-gray-400">
          역DNS 확인 {status.enabled ? "켜짐" : "꺼짐"} · {status.since_kst} 뒤 조회 {status.lookups.toLocaleString()}회
          (수집기 {status.crawler} · 해당 없음 {status.none} · 위장 {status.mismatch} · 실패 {status.unknown + status.busy}
          {status.timeouts ? ` · 2초 넘김 ${status.timeouts}` : ""}) · 캐시 적중 {status.cache_hits.toLocaleString()}
          {" "}— DNS 가 답하지 않으면 사람 브라우저는 사람으로 셉니다.
        </p>
      )}
    </section>
  );
}
