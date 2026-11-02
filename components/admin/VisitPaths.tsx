"use client";

import { Fragment, useEffect, useState } from "react";
import { adminVisit, adminVisits, type AdminVisitEvent, type AdminVisits } from "@/lib/account";

/**
 * T89: 방문(탭) 단위 열람 순서·페이지별 머문 시간 — 관리자 이용현황.
 * 방문은 브라우저 탭 하나의 임시 방문 ID 로 묶은 기록이다(탭을 닫으면 사라짐, 방문자 쿠키·회원·IP 와 잇지 않음).
 * 머문 시간은 페이지가 화면에 보이는 상태로 있던 시간만(숨긴 탭 시간은 뺌, 한 페이지 최대 60분). 검색어는 보이지 않는다.
 */
const DEVICE: Record<string, string> = { mobile: "모바일", tablet: "태블릿", pc: "PC", unknown: "알 수 없음", none: "기록 전" };
const KIND: Record<string, string> = {
  page: "페이지", law_view: "법령 조회", search: "검색", diff: "신구비교", compare: "남북비교", terms: "용어비교", chat: "AI 상담",
};

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function dur(sec: number | null | undefined): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분 ${sec % 60}초`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

const hm = (ts: string) => ts.slice(11, 19);

export default function VisitPaths() {
  const [day, setDay] = useState(kstToday);
  const [filter, setFilter] = useState<{ region?: string; org?: string; device?: string }>({});
  const [data, setData] = useState<AdminVisits | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, AdminVisitEvent[] | "loading" | "error">>({});

  useEffect(() => {
    let alive = true;
    adminVisits(day, filter)
      .then((r) => {
        if (!alive) return;
        if (r.status === 200) {
          setData(r.data);
          setError(null);
        } else {
          setData(null);
          setError(r.data.error ?? "불러오지 못했습니다.");
        }
      })
      .catch(() => alive && setError("불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, [day, filter]);

  const toggle = (visit: string) => {
    if (open === visit) {
      setOpen(null);
      return;
    }
    setOpen(visit);
    if (timeline[visit] && timeline[visit] !== "error") return;
    setTimeline((t) => ({ ...t, [visit]: "loading" }));
    adminVisit(visit)
      .then((r) => setTimeline((t) => ({ ...t, [visit]: r.status === 200 ? r.data.events : "error" })))
      .catch(() => setTimeline((t) => ({ ...t, [visit]: "error" })));
  };

  const select = (key: "region" | "org" | "device", label: string, name: (n: string) => string = (n) => n) => (
    <label className="flex items-center gap-1.5 text-xs text-gray-600">
      {label}
      <select
        value={filter[key] ?? ""}
        onChange={(e) => setFilter((f) => ({ ...f, [key]: e.target.value || undefined }))}
        className="max-w-[12rem] rounded border border-gray-300 bg-white px-1.5 py-1 text-xs"
      >
        <option value="">전체</option>
        {(data?.facets?.[key] ?? []).map((o) => (
          <option key={o.name} value={o.name}>{`${name(o.name)} (${o.visits})`}</option>
        ))}
        {filter[key] && !(data?.facets?.[key] ?? []).some((o) => o.name === filter[key]) && (
          <option value={filter[key]}>{name(filter[key] as string)}</option>
        )}
      </select>
    </label>
  );

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-gray-800">방문별 열람 순서</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            날짜
            <input type="date" value={day} max={kstToday()} onChange={(e) => e.target.value && setDay(e.target.value)}
              className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-xs" />
          </label>
          {select("region", "지역")}
          {select("org", "기관")}
          {select("device", "단말", (n) => DEVICE[n] ?? n)}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {data && !data.ready && <p className="mt-3 text-sm text-gray-500">방문별 기록을 아직 모으지 않습니다(저장소 준비 전).</p>}
      {data?.ready && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">시작</th>
                <th className="px-3 py-2 text-right">페이지</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">머문 시간 합</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">처음~마지막</th>
                <th className="px-3 py-2 text-left">지역</th>
                <th className="px-3 py-2 text-left">기관</th>
                <th className="px-3 py-2 text-left">단말</th>
              </tr>
            </thead>
            <tbody>
              {data.visits.length === 0 && <tr><td colSpan={7} className="px-4 py-3 text-gray-400">이 날짜에 방문 기록이 없습니다.</td></tr>}
              {data.visits.map((v) => {
                const t = timeline[v.visit];
                return (
                  <Fragment key={v.visit}>
                    <tr className="cursor-pointer border-t border-gray-100 hover:bg-gray-50" onClick={() => toggle(v.visit)}
                      aria-expanded={open === v.visit}>
                      <td className="px-3 py-2 tabular-nums">
                        <span className="mr-1 text-gray-400">{open === v.visit ? "▾" : "▸"}</span>
                        {hm(v.start)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.pages}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{dur(v.dwell_sec)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{dur(v.span_sec)}</td>
                      <td className="px-3 py-2">{v.region}</td>
                      <td className="px-3 py-2">{v.org}</td>
                      <td className="px-3 py-2">{DEVICE[v.device] ?? v.device}</td>
                    </tr>
                    {open === v.visit && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={7} className="px-4 py-2">
                          {t === "loading" && <span className="text-xs text-gray-400">불러오는 중…</span>}
                          {t === "error" && <span className="text-xs text-red-600">불러오지 못했습니다.</span>}
                          {Array.isArray(t) && (
                            <ol className="space-y-1 text-xs">
                              {t.map((e, i) => (
                                <li key={i} className={`flex gap-3 ${e.kind === "page" ? "" : "pl-6 text-gray-500"}`}>
                                  <span className="w-16 shrink-0 tabular-nums text-gray-500">{hm(e.ts)}</span>
                                  <span className="w-16 shrink-0">{KIND[e.kind] ?? e.kind}</span>
                                  <span className="min-w-0 flex-1 break-all">{e.kind === "page" ? e.path : e.law ?? (e.kind === "search" ? "(검색어는 보이지 않음)" : "")}</span>
                                  {e.kind === "page" && <span className="shrink-0 tabular-nums">{dur(e.dwell_sec)}</span>}
                                </li>
                              ))}
                            </ol>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {data.total > data.visits.length && (
            <p className="mt-1 text-xs text-gray-400">최근 {data.visits.length}개만 보입니다(모두 {data.total}개).</p>
          )}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">
        방문은 브라우저 탭 하나의 기록입니다(탭을 닫으면 끝, 날짜를 넘어 잇지 않음). 지역·기관·단말은 그 방문의 첫 기록 기준입니다.
        머문 시간은 페이지가 화면에 보이는 동안만 셉니다(한 페이지 최대 60분, 마지막 페이지는 탭을 닫을 때 못 받을 수 있음).
        봇·내부 접속은 지금처럼 빠지고, 검색어는 보이지 않습니다.
      </p>
    </div>
  );
}
