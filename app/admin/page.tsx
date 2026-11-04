"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminUsage, type AdminUsage } from "@/lib/account";
import AreaOrgStats from "@/components/admin/AreaOrgStats";
import ClassifyStats from "@/components/admin/ClassifyStats";
import DeviceStats from "@/components/admin/DeviceStats";
import VisitorStats from "@/components/admin/VisitorStats";
import VisitPaths from "@/components/admin/VisitPaths";
import { LawLink } from "@/components/admin/AdminLinks";
import OpDevice from "@/components/admin/OpDevice";
import SourceStats from "@/components/admin/SourceStats";

/**
 * 관리자 이용 추이(T43). 백엔드가 NKLAW_ADMIN_EMAILS 계정만 데이터를 준다(그 밖은 401·403).
 * 집계만 보인다 — 개별 회원·이메일은 없고, 검색어는 3회 이상 나온 것만 온다.
 */
// T91: 'page' 는 열람한 화면 수, 'law_view' 는 그 화면에서 법령 본문을 연 건수(법령 페이지 하나 = 열람 페이지 1 + 법령 조회 1)
const KIND_LABEL: Record<string, string> = {
  page: "열람 페이지",
  law_view: "법령 조회",
  search: "검색",
  diff: "신구비교",
  compare: "남북비교",
  terms: "용어비교",
  chat: "AI 상담",
};
const BAR = "#2b6cb0"; // T42 통계와 같은 단일 계열 색(흰 바탕 대비 검증)

export default function AdminPage() {
  const [days, setDays] = useState(30);
  const [res, setRes] = useState<{ status: number; data: AdminUsage & { error?: string } } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    adminUsage(days)
      .then((r) => alive && setRes(r))
      .catch(() => alive && setRes({ status: 0, data: { error: "불러오지 못했습니다." } as AdminUsage & { error?: string } }));
    return () => {
      alive = false;
    };
  }, [days]);

  // T91: 일별 열람 페이지(kind=page) — 법령 조회·그 밖의 기능은 말풍선에 따로. 빈 날은 0
  const daily = useMemo(() => {
    if (!res || res.status !== 200) return [];
    const by = new Map<string, { n: number; law: number; etc: number }>();
    for (const d of res.data.daily) {
      const x = by.get(d.day) ?? { n: 0, law: 0, etc: 0 };
      if (d.kind === "page") x.n += d.count;
      else if (d.kind === "law_view") x.law += d.count;
      else x.etc += d.count;
      by.set(d.day, x);
    }
    const out: { day: string; n: number; law: number; etc: number }[] = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const t = new Date(end.getTime() - i * 86400000 + 9 * 3600000).toISOString().slice(0, 10);
      out.push({ day: t, ...(by.get(t) ?? { n: 0, law: 0, etc: 0 }) });
    }
    return out;
  }, [res, days]);

  if (res === null) return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
  if (res.status !== 200) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-sm text-gray-700">
        <h1 className="text-2xl font-bold text-gray-900">이용 추이</h1>
        <p className="mt-4">{res.status === 401 ? "로그인이 필요합니다." : res.status === 403 ? "관리자만 볼 수 있습니다." : res.data?.error || "볼 수 없습니다."}</p>
        {res.status === 401 && (
          <Link href="/login?next=/admin" className="mt-4 inline-block font-semibold text-navy-light underline">로그인</Link>
        )}
      </section>
    );
  }

  const d = res.data;
  const max = Math.max(1, ...daily.map((x) => x.n));
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">이용 추이</h1>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm" role="tablist" aria-label="기간">
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              role="tab"
              aria-selected={days === n}
              onClick={() => setDays(n)}
              className={`rounded-md px-3 py-1.5 ${days === n ? "bg-navy text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {n}일
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-400">집계만 표시합니다(개별 회원 정보 없음). 검색어는 3회 이상 나온 것만 보입니다.</p>
      {d.ip_status?.missing_recent ? (
        // T67: 원본 IP 가 오지 않으면 IP 기반 기능이 꺼진 채로 돈다.
        // T82: 경고는 프록시·도커 경로(172.16/12·127/8) 흔적이 있을 때만 — LAN(공유기 헤어핀)·공인 없음만으로는 띄우지 않는다
        <div role="alert" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>
            <strong>실제 IP 미수신 의심</strong> — 최근 1시간 바깥 요청 {d.ip_status.proxy_1h ?? "?"}건이 프록시·도커 경로 주소(172.16~31.x·127.x)로
            들어왔습니다. 원본 IP 를 잃은 흔적입니다(공인 {d.ip_status.public_1h ?? 0} / 내부망(LAN) {d.ip_status.lan_1h ?? 0} / 프록시 경유 {d.ip_status.proxy_1h ?? 0},
            마지막 공인 IP {d.ip_status.last_public_kst ?? "없음"}). 그동안 IP 기반 요청 제한·챗봇 IP 백스톱·&lsquo;쿠키 없이 집계&rsquo;·접속 국가가 멈춥니다.
          </p>
          <p className="mt-1">
            확인할 곳: 노트북 L4 프록시 예약 작업 <code>KISW-l4proxy</code> 가 실행 중인지, nginx 가 <code>listen … proxy_protocol</code> 과
            <code> set_real_ip_from</code>·<code>real_ip_header proxy_protocol</code> 로 원본 IP 를 받는지.
          </p>
        </div>
      ) : d.ip_status ? (
        <p className="mt-2 text-xs text-gray-500">
          <span aria-hidden className="mr-1 text-emerald-600">●</span>
          원본 IP 정상 · 최근 1시간 공인 {d.ip_status.public_1h ?? 0} / 내부망(LAN) {d.ip_status.lan_1h ?? 0} / 프록시 경유 {d.ip_status.proxy_1h ?? 0}
          {d.ip_status.last_public_kst ? <> · 마지막 공인 {d.ip_status.last_public_kst}</> : null}
          {d.ip_status.warming_up ? <> · 재시작 뒤 1시간 안(시작 {d.ip_status.started_kst ?? "?"}) — 아직 집계가 적습니다</> : null}
          {d.ip_status.no_public_1h ? <> · 최근 1시간 공인 IP 요청 없음(방문이 적은 시간일 수 있음 — 경고 아님)</> : null}
          {" "}— 내부망(공유기 경유)·관리자 본인 접속은 국가 없이 셉니다
        </p>
      ) : null}

      {/* T90: 이 브라우저(운영자 기기) 집계 제외 켜기·끄기 */}
      <OpDevice />

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "회원", value: d.users.total },
          { label: `신규 가입(${days}일)`, value: d.users.new },
          { label: `로그인 회원(${days}일)`, value: d.users.active },
          { label: "이용 기록 분석 동의", value: d.users.usage_opt_in },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <dt className="text-xs text-gray-500">{t.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-navy">{t.value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {/* T52: 방문자 수·접속 국가·봇 */}
      {d.visitors && <VisitorStats v={d.visitors} days={days} geoip={d.geoip} />}
      {/* T83: 접속 지역·기관 */}
      {d.visitors && <AreaOrgStats v={d.visitors} days={days} geoip={d.geoip} />}
      {/* T88: 접속 단말 종류(모바일·태블릿·PC) */}
      {d.visitors && <DeviceStats v={d.visitors} days={days} />}
      {/* T85: 방문 분류 사유별 건수(봇·렌더러·사칭·의심·내부) */}
      {d.visitors && <ClassifyStats v={d.visitors} days={days} status={d.classifier} />}
      {/* T91: 유입 경로(방문 첫 페이지의 출처 분류) */}
      {d.visitors && <SourceStats v={d.visitors} days={days} />}
      {/* T89: 방문(탭)별 열람 순서·머문 시간 */}
      {d.visitors && <VisitPaths />}

      <h2 className="mt-8 text-lg font-bold text-gray-800">기능별 이용({days}일)</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <li key={k} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{(d.totals[k] ?? 0).toLocaleString()}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-bold text-gray-800">일별 열람 페이지</h2>
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative flex h-40 items-end gap-[2px]" role="img" aria-label={`최근 ${days}일 일별 열람 페이지`}>
          {daily.map((x, i) => (
            <button
              key={x.day}
              type="button"
              className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${x.day} 열람 페이지 ${x.n}, 법령 조회 ${x.law}, 그 밖의 기능 ${x.etc}`}
            >
              <span className="block w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${(x.n / max) * 100}%`, minHeight: x.n ? 2 : 0, background: BAR, opacity: hover === null || hover === i ? 1 : 0.45 }} />
              {hover === i && (
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                  {x.day} · 열람 페이지 <strong>{x.n}</strong> · 법령 조회 {x.law} · 그 밖의 기능 {x.etc}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-gray-400">
          <span>{daily[0]?.day}</span>
          <span>{daily[daily.length - 1]?.day}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-gray-800">많이 본 법령</h2>
          <ol className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
            {d.top_laws.length === 0 && <li className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</li>}
            {d.top_laws.map((l, i) => (
              <li key={l.name} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-right font-semibold text-navy-light">{i + 1}</span>
                <LawLink name={l.name} className="flex-1 truncate hover:underline" />
                <span className="tabular-nums text-gray-500">{l.count}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">많이 찾은 검색어</h2>
          <ol className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
            {d.top_queries.length === 0 && <li className="px-4 py-3 text-gray-400">3회 이상 나온 검색어가 없습니다.</li>}
            {d.top_queries.map((qq, i) => (
              <li key={qq.query} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-right font-semibold text-navy-light">{i + 1}</span>
                <span className="flex-1 truncate">{qq.query}</span>
                <span className="tabular-nums text-gray-500">{qq.count}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
