"use client";

import { Fragment, useEffect, useState } from "react";
import { adminVisit, adminVisits, type AdminVisitEvent, type AdminVisits } from "@/lib/account";
import { decPath } from "./decPath";

/**
 * T89: 방문(탭) 단위 열람 순서·페이지별 머문 시간 — 관리자 이용현황.
 * 방문은 브라우저 탭 하나의 임시 방문 ID 로 묶은 기록이다(탭을 닫으면 사라짐, 방문자 쿠키·회원·IP 와 잇지 않음).
 * 머문 시간은 페이지가 화면에 보이는 상태로 있던 시간만(숨긴 탭 시간은 뺌, 한 페이지 최대 60분). 검색어는 보이지 않는다.
 * T91: 열람 순서는 화면(page) 기준 — 법령 조회(law_view)는 따로 줄을 만들지 않고 그 화면 줄에 표시한다. 유입 경로(첫 페이지의 출처) 칸·거르기.
 * T93: 페이지 주소는 글자로 풀어 보인다(decPath — 잘못된 인코딩은 원문 그대로).
 * T96: 머문 시간 '측정 안 됨'(신호가 오지 않음 — 보이는 상태가 0.5초 미만이었거나 뒤 탭·아직 열림·렌더러)과
 *      측정된 값을 가른다(값 0 은 '1초 미만' — 지금 화면은 0 을 보내지 않지만 API 는 받는다). 방문 합계는 측정된 페이지만 더하고, 일부만 측정됐으면 그 수를 붙인다.
 */
const DEVICE: Record<string, string> = { mobile: "모바일", tablet: "태블릿", pc: "PC", unknown: "알 수 없음", none: "기록 전" };
export const SRC: Record<string, string> = {
  ai: "AI 답변", search: "검색", social: "SNS·커뮤니티", other: "다른 사이트", direct: "유입 정보 없음(주소 입력·즐겨찾기·앱·메신저)", none: "기록 없음",
};
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

const UNMEASURED = "측정 안 됨";
const UNMEASURED_TIP = "머문 시간 신호가 오지 않았습니다 — 보이는 상태로 0.5초를 못 넘겼거나, 뒤 탭으로 열려 아직 보지 않았거나, 화면을 그리기만 한 렌더러입니다.";

/** T96: 페이지 하나의 머문 시간 — null 은 '측정 안 됨', 0 은 '1초 미만'. */
function Dwell({ sec }: { sec: number | null | undefined }) {
  if (sec == null) return <span className="text-gray-400" title={UNMEASURED_TIP}>{UNMEASURED}</span>;
  return <>{sec === 0 ? "1초 미만" : dur(sec)}</>;
}

/** T96: 방문의 머문 시간 합 — 측정된 페이지만 더한다. 일부 페이지만 측정됐으면 '(n쪽 중 m쪽)'.
 * 백엔드(T96)는 측정된 페이지가 없으면 dwell_sec 를 null 로, 측정된 페이지 수를 dwell_pages 로 준다(옛 백엔드는 0·없음). */
function DwellSum({ sec, measured, pages }: { sec: number | null | undefined; measured?: number; pages: number }) {
  if (sec == null) return <Dwell sec={null} />;
  return (
    <>
      <Dwell sec={sec} />
      {measured != null && measured < pages && (
        <span className="ml-1 text-xs text-gray-400" title={`${pages - measured}쪽은 머문 시간 신호가 없어 합에 넣지 않았습니다.`}>
          ({pages}쪽 중 {measured}쪽)
        </span>
      )}
    </>
  );
}

const hm = (ts: string) => ts.slice(11, 19);
const at = (ts: string) => Date.parse(ts.replace(" ", "T") + "+09:00");

type Line = AdminVisitEvent & { laws: string[] };

/** 화면(page) 줄마다 그 화면에서 일어난 법령 조회를 붙인다 — 같은 법령 주소(/law/<이름>)의 가장 가까운 화면, 없으면 시각이 가장 가까운 화면. */
function lines(ev: AdminVisitEvent[]): Line[] {
  const out: Line[] = ev.filter((e) => e.kind !== "law_view").map((e) => ({ ...e, laws: [] }));
  const pages = out.filter((e) => e.kind === "page");
  for (const e of ev) {
    if (e.kind !== "law_view") continue;
    const same = pages.filter((p) => e.law && decPath(p.path) === `/law/${e.law}`);
    const pool = same.length ? same : pages;
    if (!pool.length) {
      out.push({ ...e, laws: [] });       // 화면 기록이 없는 법령 조회(드묾)는 따로 한 줄
      continue;
    }
    const best = pool.reduce((a, b) => (Math.abs(at(b.ts) - at(e.ts)) < Math.abs(at(a.ts) - at(e.ts)) ? b : a));
    best.laws.push(e.law ?? "");
  }
  return out.sort((a, b) => at(a.ts) - at(b.ts));
}

export default function VisitPaths() {
  const [day, setDay] = useState(kstToday);
  const [filter, setFilter] = useState<{ region?: string; org?: string; device?: string; src?: string }>({});
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

  const select = (key: "region" | "org" | "device" | "src", label: string, name: (n: string) => string = (n) => n) => (
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
          {select("src", "유입", (n) => SRC[n] ?? n)}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {data && !data.ready && <p className="mt-3 text-sm text-gray-500">방문별 기록을 아직 모으지 않습니다(저장소 준비 전).</p>}
      {data?.ready && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">시작</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">열람 페이지</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">법령 조회</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">머문 시간 합</th>
                <th className="whitespace-nowrap px-3 py-2 text-right">처음~마지막</th>
                <th className="px-3 py-2 text-left">지역</th>
                <th className="px-3 py-2 text-left">기관</th>
                <th className="px-3 py-2 text-left">단말</th>
                <th className="px-3 py-2 text-left">유입</th>
              </tr>
            </thead>
            <tbody>
              {data.visits.length === 0 && <tr><td colSpan={9} className="px-4 py-3 text-gray-400">이 날짜에 방문 기록이 없습니다.</td></tr>}
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
                      <td className="px-3 py-2 text-right tabular-nums">{v.law_views ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums"><DwellSum sec={v.dwell_sec} measured={(v as typeof v & { dwell_pages?: number }).dwell_pages} pages={v.pages} /></td>
                      <td className="px-3 py-2 text-right tabular-nums">{dur(v.span_sec)}</td>
                      <td className="px-3 py-2">{v.region}</td>
                      <td className="px-3 py-2">{v.org}</td>
                      <td className="px-3 py-2">{DEVICE[v.device] ?? v.device}</td>
                      <td className="px-3 py-2">
                        {SRC[v.src ?? "none"] ?? v.src}
                        {v.src_host && <span className="ml-1 text-xs text-gray-400">{v.src_host}</span>}
                      </td>
                    </tr>
                    {open === v.visit && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={9} className="px-4 py-2">
                          {t === "loading" && <span className="text-xs text-gray-400">불러오는 중…</span>}
                          {t === "error" && <span className="text-xs text-red-600">불러오지 못했습니다.</span>}
                          {Array.isArray(t) && (
                            <ol className="space-y-1 text-xs">
                              {lines(t).map((e, i) => (
                                <li key={i} className={`flex gap-3 ${e.kind === "page" ? "" : "pl-6 text-gray-500"}`}>
                                  <span className="w-16 shrink-0 tabular-nums text-gray-500">{hm(e.ts)}</span>
                                  <span className="w-16 shrink-0">{KIND[e.kind] ?? e.kind}</span>
                                  <span className="min-w-0 flex-1 break-all">
                                    {e.kind === "page" ? decPath(e.path) : e.law ?? (e.kind === "search" ? "(검색어는 보이지 않음)" : "")}
                                    {e.laws.length > 0 && (
                                      <span className="ml-2 whitespace-nowrap rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-800" title={e.laws.join(", ")}>
                                        법령 조회{e.laws.length > 1 ? ` ${e.laws.length}` : ""}
                                      </span>
                                    )}
                                  </span>
                                  {e.kind === "page" && <span className="shrink-0 tabular-nums"><Dwell sec={e.dwell_sec} /></span>}
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
        방문은 브라우저 탭 하나의 기록입니다(탭을 닫으면 끝, 날짜를 넘어 잇지 않음). 지역·기관·단말·유입은 그 방문의 첫 기록 기준입니다.
        열람 페이지는 화면 수이고, 법령 조회는 그 화면에서 법령 본문을 연 건수입니다(법령 페이지 하나 = 열람 페이지 1 + 법령 조회 1).
        머문 시간은 페이지가 화면에 보이는 동안만 셉니다(한 페이지 최대 60분, 마지막 페이지는 탭을 닫을 때 못 받을 수 있음).
        「측정 안 됨」은 머문 시간 신호가 오지 않은 페이지입니다(보이는 상태로 0.5초를 못 넘김·뒤 탭으로 열고 아직 안 봄·렌더러). 0초와 다르며 합계에 넣지 않습니다.
        봇·내부 접속은 지금처럼 빠지고, 검색어는 보이지 않습니다.
      </p>
    </div>
  );
}
