"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { adminUsage, type AdminUsage } from "@/lib/account";

/**
 * 관리자 이용 추이(T43). 백엔드가 NKLAW_ADMIN_EMAILS 계정만 데이터를 준다(그 밖은 401·403).
 * 집계만 보인다 — 개별 회원·이메일은 없고, 검색어는 3회 이상 나온 것만 온다.
 */
const KIND_LABEL: Record<string, string> = {
  page: "페이지",
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

  // 일별 합계(모든 종류) — 빈 날은 0
  const daily = useMemo(() => {
    if (!res || res.status !== 200) return [];
    const by = new Map<string, number>();
    for (const d of res.data.daily) by.set(d.day, (by.get(d.day) ?? 0) + d.count);
    const out: { day: string; n: number }[] = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const t = new Date(end.getTime() - i * 86400000 + 9 * 3600000).toISOString().slice(0, 10);
      out.push({ day: t, n: by.get(t) ?? 0 });
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

      <h2 className="mt-8 text-lg font-bold text-gray-800">기능별 이용({days}일)</h2>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {Object.entries(KIND_LABEL).map(([k, label]) => (
          <li key={k} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">{(d.totals[k] ?? 0).toLocaleString()}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-bold text-gray-800">일별 이용 건수</h2>
      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative flex h-40 items-end gap-[2px]" role="img" aria-label={`최근 ${days}일 일별 이용 건수`}>
          {daily.map((x, i) => (
            <button
              key={x.day}
              type="button"
              className="relative flex h-full min-w-0 flex-1 items-end justify-center outline-none"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${x.day} ${x.n}건`}
            >
              <span className="block w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${(x.n / max) * 100}%`, minHeight: x.n ? 2 : 0, background: BAR, opacity: hover === null || hover === i ? 1 : 0.45 }} />
              {hover === i && (
                <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white">
                  {x.day} · <strong>{x.n}</strong>건
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
                <Link href={`/law/${encodeURIComponent(l.name)}`} className="flex-1 truncate hover:underline">{l.name}</Link>
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
