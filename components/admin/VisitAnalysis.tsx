"use client";

import { Fragment, useEffect, useState } from "react";
import {
  adminAnalysis, adminAnalysisAggs, analysisCsvHref,
  type AdminAnalysis, type AdminAnalysisAggs, type AnalysisStep, type AnalysisVisit,
} from "@/lib/account";
import { LawLink, PathLink } from "./AdminLinks";
import { aggsQuery, analysisQuery, BOT_KIND, DIM, kstDay, ORG_KIND, RULE, VERDICT, type AnalysisFilter } from "./analysisQuery";
import { SRC } from "./VisitPaths";

/**
 * T101: 방문 분석 — 정기 점검·원자료 분석에서 방문(탭)마다 내린 판정(사람·봇·보류)과 근거, 한 줄 요약.
 * 저장된 것은 시각(분)·페이지 흐름·머문 시간·단말·나라/지역·기관·유입·판정뿐이다(IP·쿠키·방문자 ID·검색어·브라우저 정보 없음, 13개월 보관).
 * 아래 기간 집계는 3방문 미만 칸을 '(기타)'로 묶은 숫자라 오래 보관하며, 내려받기(CSV)는 이 집계만 된다.
 * 경로·법령명은 T99 링크(새 탭·미리 받기 없음 — AdminLinks).
 * T102: 기관은 화면 이름(한국 기관은 한글 — KISA 공식 기관명), 저장된 영문 이름은 말풍선.
 */
const DEVICE: Record<string, string> = { mobile: "모바일", tablet: "태블릿", pc: "PC", unknown: "알 수 없음" };
const STEP: Record<string, string> = {
  page: "페이지", law_view: "법령 조회", search: "검색", diff: "신구비교", compare: "남북비교", terms: "용어비교", chat: "AI 상담",
};
const BADGE: Record<string, string> = {
  human: "bg-emerald-50 text-emerald-800", bot: "bg-gray-100 text-gray-700", hold: "bg-amber-50 text-amber-900",
};

function dur(sec: number | null | undefined): string {
  if (sec == null) return "측정 안 됨";
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분 ${sec % 60}초`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

/** T102: API 의 화면 이름(org_label) — 옛 API(T101)면 저장된 이름 */
const orgLabel = (v: AnalysisVisit) => (v as AnalysisVisit & { org_label?: string | null }).org_label ?? v.org;

function Step({ s }: { s: AnalysisStep }) {
  return (
    <li className={`flex gap-3 ${s.kind === "page" ? "" : "pl-6 text-gray-500"}`}>
      <span className="w-12 shrink-0 tabular-nums text-gray-500">{s.t}</span>
      <span className="w-16 shrink-0">{STEP[s.kind] ?? s.kind}</span>
      <span className="min-w-0 flex-1 break-all">
        {s.kind === "page" ? <PathLink path={s.path} /> : s.law ? <LawLink name={s.law} /> : s.kind === "search" ? "(검색어는 저장하지 않음)" : ""}
        {s.note && <span className="ml-2 text-[11px] text-gray-500">{s.note}</span>}
      </span>
      {s.kind === "page" && <span className={`shrink-0 tabular-nums ${s.dwell == null ? "text-gray-400" : ""}`}>{dur(s.dwell)}</span>}
    </li>
  );
}

function Select({ label, value, onChange, options }: {
  label: string; value: string | undefined; onChange: (v: string) => void; options: { value: string; text: string }[];
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="text-gray-500">{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
        <option value="">전체</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
      </select>
    </label>
  );
}

export default function VisitAnalysis() {
  const [from, setFrom] = useState(() => kstDay(6));
  const [to, setTo] = useState(() => kstDay(0));
  const [filter, setFilter] = useState<AnalysisFilter>({});
  const [data, setData] = useState<AdminAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [period, setPeriod] = useState<"day" | "week">("week");
  const [dim, setDim] = useState("verdict");
  const [aggs, setAggs] = useState<AdminAnalysisAggs | null>(null);

  useEffect(() => {
    let alive = true;
    adminAnalysis(analysisQuery(from, to, filter))
      .then((r) => {
        if (!alive) return;
        if (r.status === 200) {
          setData(r.data);
          setError(null);
        } else setError(r.data?.error ?? "불러오지 못했습니다.");
      })
      .catch(() => alive && setError("불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, [from, to, filter]);

  useEffect(() => {
    let alive = true;
    adminAnalysisAggs(aggsQuery(period, from, to, dim))
      .then((r) => alive && setAggs(r.status === 200 ? r.data : null))
      .catch(() => alive && setAggs(null));
    return () => {
      alive = false;
    };
  }, [period, from, to, dim]);

  const facet = (k: keyof AdminAnalysis["facets"], label: (n: string) => string = (n) => n) =>
    (data?.facets[k] ?? []).map((f) => ({ value: f.name, text: `${label(f.name)} (${f.visits})` }));
  const set = (k: keyof AnalysisFilter) => (v: string) => setFilter((f) => ({ ...f, [k]: v || undefined }));
  const verdicts = Object.fromEntries((data?.facets.verdict ?? []).map((f) => [f.name, f.visits]));

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <span className="text-gray-500">기간</span>
          <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
          <span>~</span>
          <input type="date" value={to} min={from} max={kstDay(0)} onChange={(e) => e.target.value && setTo(e.target.value)} className="rounded border border-gray-300 px-2 py-1" />
        </label>
        {[["오늘", 0], ["7일", 6], ["30일", 29]].map(([t, n]) => (
          <button key={t} onClick={() => { setFrom(kstDay(n as number)); setTo(kstDay(0)); }} className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-100">
            {t}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <Select label="판정" value={filter.verdict} onChange={set("verdict")} options={facet("verdict", (n) => VERDICT[n] ?? n)} />
        <Select label="나라" value={filter.country} onChange={set("country")} options={facet("country")} />
        <Select label="유입" value={filter.src} onChange={set("src")} options={facet("src", (n) => SRC[n] ?? n)} />
        <Select label="기관 종류" value={filter.org_kind} onChange={set("org_kind")} options={facet("org_kind", (n) => ORG_KIND[n] ?? n)} />
        <Select label="법령" value={filter.law} onChange={set("law")} options={facet("law")} />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {data && !data.ready && (
        <p className="mt-3 text-sm text-gray-500">방문 분석 표가 아직 없습니다(DB 에 방문 분석 표를 만든 뒤 점검 결과를 넣으면 보입니다).</p>
      )}
      {data?.ready && (
        <>
          <p className="mt-3 text-sm text-gray-700">
            {data.from} ~ {data.to} · 분석한 방문 <strong>{data.total}</strong>
            {" "}(사람 {verdicts.human ?? 0} · 봇 {verdicts.bot ?? 0} · 보류 {verdicts.hold ?? 0} — 거르기 전 기간 전체)
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">날짜·시각</th><th className="px-3 py-2">판정</th><th className="px-3 py-2">나라·지역</th>
                  <th className="px-3 py-2">기관</th><th className="px-3 py-2">단말</th><th className="px-3 py-2">유입</th>
                  <th className="px-3 py-2 text-right">페이지</th><th className="px-3 py-2 text-right">머문 시간</th>
                  <th className="px-3 py-2">한 줄 요약</th>
                </tr>
              </thead>
              <tbody>
                {data.visits.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-3 text-gray-400">이 기간·거르기에 맞는 분석이 없습니다.</td></tr>
                )}
                {data.visits.map((v: AnalysisVisit) => (
                  <Fragment key={v.id}>
                    <tr className="cursor-pointer border-t border-gray-100 align-top hover:bg-gray-50" onClick={() => setOpen(open === v.id ? null : v.id)}
                      aria-expanded={open === v.id}>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        <span className="mr-1 text-gray-400">{open === v.id ? "▾" : "▸"}</span>
                        {v.day.slice(5)} {v.start}{v.end && v.end !== v.start ? `~${v.end}` : ""}
                        {v.label && <span className="ml-1 text-xs text-gray-400">{v.label}</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${BADGE[v.verdict] ?? ""}`}>{VERDICT[v.verdict] ?? v.verdict}</span>
                        {v.bot_kind && <div className="mt-0.5 text-[11px] text-gray-500">{BOT_KIND[v.bot_kind] ?? v.bot_kind}</div>}
                      </td>
                      <td className="px-3 py-2">{v.country ?? "—"}{v.region ? ` ${v.region}` : ""}</td>
                      <td className="px-3 py-2">
                        {/* T102: 화면 이름(한글 기관명 — JSON 의 org_ko 또는 KISA 기관명·통신사 묶음), 저장된 영문 이름은 말풍선 */}
                        <span title={v.org ?? undefined}>{orgLabel(v) ?? "—"}</span>
                        <div className="text-[11px] text-gray-500">{ORG_KIND[v.org_kind] ?? v.org_kind}{v.asn ? ` · AS${v.asn}` : ""}</div>
                      </td>
                      <td className="px-3 py-2">{DEVICE[v.device] ?? v.device}</td>
                      <td className="px-3 py-2">
                        {SRC[v.src] ?? v.src}
                        {v.src_host && <div className="text-[11px] text-gray-400">{v.src_host}</div>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{v.pages}</td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${v.dwell_sec == null ? "text-gray-400" : ""}`}>{dur(v.dwell_sec)}</td>
                      <td className="px-3 py-2 text-gray-700">{v.summary}</td>
                    </tr>
                    {open === v.id && (
                      <tr className="bg-gray-50/60">
                        <td colSpan={9} className="px-4 py-2 text-xs">
                          <ol className="space-y-1">{v.flow.map((s, i) => <Step key={i} s={s} />)}</ol>
                          <p className="mt-2 text-gray-600">
                            근거: {v.rules.length ? v.rules.map((r) => RULE[r] ?? r).join(" · ") : "—"}
                            {v.laws.length > 0 && <> · 법령 {v.laws.map((l, i) => <Fragment key={l}>{i > 0 && ", "}<LawLink name={l} /></Fragment>)}</>}
                            {v.topics.length > 0 && <> · 분야 {v.topics.join(", ")}</>}
                            {" "}· 출처 {v.source}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {data.total > data.visits.length && (
            <p className="mt-1 text-xs text-gray-400">최근 {data.visits.length}개만 보입니다(모두 {data.total}개).</p>
          )}
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-gray-800">기간 집계</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5" role="tablist" aria-label="집계 단위">
            {(["day", "week"] as const).map((p) => (
              <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1 ${period === p ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {p === "day" ? "일" : "주"}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1">
            <span className="text-gray-500">기준</span>
            <select value={dim} onChange={(e) => setDim(e.target.value)} className="rounded border border-gray-300 px-2 py-1">
              {Object.entries(DIM).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
            </select>
          </label>
          <a href={analysisCsvHref(aggsQuery(period, from, to))} download className="rounded border border-gray-300 px-2 py-1 text-navy-light hover:bg-gray-100">
            집계 CSV 내려받기
          </a>
        </div>
      </div>
      {aggs && !aggs.ready && <p className="mt-2 text-sm text-gray-500">집계 표가 아직 없습니다.</p>}
      {aggs?.ready && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">{period === "day" ? "날짜" : "주(월요일)"}</th><th className="px-3 py-2">{DIM[dim]}</th>
                <th className="px-3 py-2">판정</th><th className="px-3 py-2 text-right">방문</th><th className="px-3 py-2 text-right">페이지</th>
              </tr>
            </thead>
            <tbody>
              {aggs.rows.length === 0 && <tr><td colSpan={5} className="px-3 py-3 text-gray-400">이 기간의 집계가 없습니다.</td></tr>}
              {aggs.rows.map((r) => (
                <tr key={`${r.start}-${r.dim}-${r.key}-${r.verdict}`} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 tabular-nums">{r.start}</td>
                  <td className="px-3 py-1.5">
                    {r.dim === "verdict" ? VERDICT[r.key] ?? r.key : r.dim === "org_kind" ? ORG_KIND[r.key] ?? r.key
                      : r.dim === "src" ? SRC[r.key] ?? r.key : r.dim === "device" ? DEVICE[r.key] ?? r.key : r.key}
                  </td>
                  <td className="px-3 py-1.5">{r.verdict === "all" ? "전체" : VERDICT[r.verdict] ?? r.verdict}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.visits}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.pages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">
        방문 분석은 점검 때 방문(탭)마다 사람·봇·보류를 가린 결과입니다. 시각(분)·페이지 흐름·머문 시간·단말·나라/지역·기관·유입·판정만 담고,
        IP·쿠키·방문자 ID·검색어·브라우저 정보는 담지 않으며 13개월 뒤 지웁니다. 기간 집계는 {aggs?.min_cell ?? 3}방문 미만 칸을 「(기타)」로 묶은
        숫자로, 방문 하나로 거슬러 갈 수 없어 오래 보관합니다. 내려받기는 집계만 됩니다. 법령·분야 집계는 한 방문이 여러 법령을 보면 법령마다 셉니다.
      </p>
    </div>
  );
}
