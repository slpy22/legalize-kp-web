"use client";

import { useMemo, useState } from "react";
import type { AdminVisitors } from "@/lib/account";

/**
 * T83: 접속 지역(한국 시·도)·접속 기관 — 관리자 이용현황. 집계만 보인다(IP 는 저장하지 않음).
 * 통신사(가정·모바일 회선 — KT·SK브로드밴드·LG유플러스·SK텔레콤·케이블)는 개인 회선이라 기본은 한 줄로 묶고, 펼쳐 볼 수 있다.
 */
const KIND_LABEL: Record<string, string> = {
  isp: "통신사(가정·모바일)", univ: "대학·교육", research: "연구기관", gov: "정부·공공", cloud: "클라우드·호스팅", other: "기업·기타",
};
const KIND_COLOR: Record<string, string> = {
  isp: "bg-gray-100 text-gray-700", univ: "bg-sky-50 text-sky-800", research: "bg-violet-50 text-violet-800",
  gov: "bg-emerald-50 text-emerald-800", cloud: "bg-amber-50 text-amber-800", other: "bg-gray-50 text-gray-600",
};

export default function AreaOrgStats({ v, days, geoip }: {
  v: AdminVisitors;
  days: number;
  geoip?: { region?: boolean; org?: boolean; loading?: boolean; attribution: string; attribution_url: string };
}) {
  const [groupIsp, setGroupIsp] = useState(true);
  const regions = v.regions ?? [];
  const orgs = useMemo(() => {
    const all = v.orgs ?? [];
    if (!groupIsp) return all;
    const isp = all.filter((o) => o.kind === "isp");
    const rest = all.filter((o) => o.kind !== "isp");
    if (isp.length === 0) return rest;
    const sum = {
      org: `통신사 회선 합계(${isp.map((o) => o.org).join("·")})`, kind: "isp", country: "KR",
      visitors: isp.reduce((n, o) => n + o.visitors, 0), pages: isp.reduce((n, o) => n + o.pages, 0),
      law_views: isp.reduce((n, o) => n + o.law_views, 0),
    };
    return [sum, ...rest].sort((a, b) => b.visitors - a.visitors || b.pages - a.pages || b.law_views - a.law_views);
  }, [v.orgs, groupIsp]);

  const empty = (cols: number) => <tr><td colSpan={cols} className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</td></tr>;
  const note = geoip?.loading ? " · 판별 자료를 읽는 중입니다(기동 뒤 잠깐)" : geoip && geoip.region === false ? " · 지역 판별 자료가 아직 없습니다" : "";

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <div>
        <h2 className="text-lg font-bold text-gray-800">접속 지역 — 한국 시·도({days}일)</h2>
        <table className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="px-4 py-2 text-left">시·도</th><th className="px-4 py-2 text-right">방문자(일별 합)</th><th className="whitespace-nowrap px-4 py-2 text-right">열람 페이지</th><th className="whitespace-nowrap px-4 py-2 text-right">법령 조회</th></tr>
          </thead>
          <tbody>
            {regions.length === 0 && empty(4)}
            {regions.map((r) => (
              <tr key={r.region} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.region}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.visitors.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.pages.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{r.law_views.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-400">
          지역은 IP 대역의 등록 위치라 실제 위치와 다를 수 있습니다(특히 통신사 회선은 &lsquo;경기&rsquo;로 많이 잡힙니다). 해외 접속은 위 국가 표에서 봅니다.{note}
        </p>
      </div>
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-800">접속 기관({days}일)</h2>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={groupIsp} onChange={(e) => setGroupIsp(e.target.checked)} />
            통신사 회선 한 줄로 묶기
          </label>
        </div>
        <table className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr><th className="px-4 py-2 text-left">기관</th><th className="whitespace-nowrap px-4 py-2 text-right">방문자</th><th className="whitespace-nowrap px-4 py-2 text-right">열람 페이지</th><th className="whitespace-nowrap px-4 py-2 text-right">법령 조회</th></tr>
          </thead>
          <tbody>
            {orgs.length === 0 && empty(4)}
            {orgs.map((o) => (
              <tr key={`${o.kind}-${o.org}`} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] ${KIND_COLOR[o.kind] ?? KIND_COLOR.other}`}>{KIND_LABEL[o.kind] ?? o.kind}</span>
                  {o.org}
                  {o.country && o.country !== "KR" && <span className="ml-1 text-xs text-gray-400">{o.country}</span>}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{o.visitors.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{o.pages.toLocaleString()}</td>
                <td className="px-4 py-2 text-right tabular-nums">{o.law_views.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-400">
          기관은 IP 대역을 쓰는 기관(ASN) 이름입니다. 클라우드·호스팅은 봇·VPN 이 많습니다.{" "}
          {geoip && <a href={geoip.attribution_url} target="_blank" rel="noopener noreferrer" className="underline">{geoip.attribution}</a>}
          {geoip && " (CC BY 4.0)"}
        </p>
      </div>
    </div>
  );
}
