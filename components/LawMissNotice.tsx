"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { fetchLawResolve, fetchLawVersions } from "@/lib/api";
import type { LawVersionMeta } from "@/lib/types";
import {
  decodeName, isApiError, nearestVersion, objectParticle, othersLead, pickSuggestions, sharedReason, shownReason,
  type NameSuggestion,
} from "@/lib/versionMiss";

/**
 * T77: 없는 법령·없는 판본 일자 주소의 안내(app/law/[name]/not-found.tsx 가 그린다, HTTP 404 · noindex).
 * Next 는 not-found 를 정상 화면에서도 미리 그려 두므로, 판본 목록은 이 안내가 실제로 보일 때(브라우저) 불러온다.
 */
export default function LawMissNotice() {
  const params = useParams<{ name: string }>();
  const search = useSearchParams();
  const name = decodeName(String(params?.name ?? ""));
  const version = (search.get("version") || "").slice(0, 40);
  // undefined = 불러오는 중, null = 법령 없음(또는 불러오지 못함)
  const [versions, setVersions] = useState<LawVersionMeta[] | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    if (!name) return;
    fetchLawVersions(name)
      .then((r) => {
        if (!alive) return;
        setVersions(isApiError(r) ? null : [...(r.versions || [])].sort((a, b) => a.version_date.localeCompare(b.version_date)));
      })
      .catch(() => alive && setVersions(null));
    return () => {
      alive = false;
    };
  }, [name]);

  // T97: 법령이 없을 때만 비슷한 이름 후보를 묻는다(자동 이동 없음 — 제안 링크만). 후보가 없으면 화면은 그대로.
  const [sugg, setSugg] = useState<{ strong: NameSuggestion | null; others: NameSuggestion[] } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!name || versions !== null) return;
    fetchLawResolve(name)
      .then((r) => alive && setSugg(pickSuggestions(r, name)))
      .catch(() => alive && setSugg(null));
    return () => {
      alive = false;
    };
  }, [name, versions]);

  const lawHref = `/law/${encodeURIComponent(name)}`;

  if (!name || versions === null || (versions === undefined && !version)) {
    const hasSugg = !!sugg && (!!sugg.strong || sugg.others.length > 0);
    return (
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="mb-3 text-2xl font-bold text-navy">법령을 찾을 수 없습니다</h1>
        <p className="mb-6 text-sm text-gray-600">
          {name ? <>‘{name}’ 이라는 이름의 법령이 없습니다. </> : null}
          이름이 바뀌었거나 다른 표기일 수 있습니다. 검색하거나 법령 찾기의 분야별 목록에서 찾아 보세요.
        </p>
        {versions === null && hasSugg && sugg && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-gray-800" role="status">
            {sugg.strong && (
              <p className="text-base">
                혹시{" "}
                <Link prefetch={false} href={`/law/${encodeURIComponent(sugg.strong.name)}`} className="font-bold text-navy-light underline hover:text-navy">
                  「{sugg.strong.name}」
                </Link>
                {objectParticle(sugg.strong.name)} 찾으셨나요?
                {shownReason(sugg.strong) && <span className="ml-1 text-sm text-gray-500">({shownReason(sugg.strong)})</span>}
              </p>
            )}
            {sugg.others.length > 0 && (
              <p className={sugg.strong ? "mt-2 text-gray-600" : undefined}>
                {othersLead(sugg.strong, sugg.others)}
                {sugg.others.map((c, i) => (
                  <span key={c.name}>
                    {i > 0 && " · "}
                    <Link prefetch={false} href={`/law/${encodeURIComponent(c.name)}`} className="font-medium text-navy-light underline hover:text-navy">
                      「{c.name}」
                    </Link>
                    {/* T98: 옛이름·남한 대응·관련 있을 수 있음 — 왜 이 법령을 권하는지 */}
                    {shownReason(c) && !sharedReason(sugg.others) && <span className="text-xs text-gray-500"> ({shownReason(c)})</span>}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-sm">
          {name && (
            <Link prefetch={false} href={`/search?q=${encodeURIComponent(name)}`} className="rounded-lg bg-navy px-4 py-2 font-semibold text-white hover:bg-navy-light">
              ‘{name}’ 검색
            </Link>
          )}
          {/* /law-index 는 자동완성용 JSON 이라 사람에게 날것이 보였다(T97) — 법령 목록 화면은 /search(분야별 목록) */}
          <Link prefetch={false} href="/search" className="rounded-lg border border-navy-light px-4 py-2 font-medium text-navy-light hover:bg-navy-light hover:text-white">
            법령 찾기
          </Link>
          <Link prefetch={false} href="/" className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100">
            홈
          </Link>
        </div>
      </section>
    );
  }

  const list = versions ?? [];
  const { nearest, before } = nearestVersion(version, list.map((v) => v.version_date));
  const latest = list.length ? list[list.length - 1].version_date : null;
  const links = (
    <div className="flex flex-wrap gap-3 text-sm">
      {/* 같은 경로(?version 만 다름)로 가는 링크는 전체 이동 — Next 의 404 경계는 경로가 바뀔 때만 풀린다 */}
      <a href={lawHref} className="rounded-lg bg-navy px-4 py-2 font-semibold text-white hover:bg-navy-light">
        {list.length ? "현행본 보기" : "법령 정보"}
      </a>
      <Link prefetch={false} href={`${lawHref}/history`} className="rounded-lg border border-navy-light px-4 py-2 font-medium text-navy-light hover:bg-navy-light hover:text-white">
        개정이력
      </Link>
    </div>
  );

  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-6 text-sm text-gray-500">
        <Link prefetch={false} href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <a href={lawHref} className="hover:text-navy-light">{name}</a>
      </nav>
      <h1 className="mb-3 text-2xl font-bold text-navy">그 일자의 판본이 없습니다</h1>
      {versions === undefined ? (
        <>
          <p className="mb-6 text-sm text-gray-600" role="status">
            {name}에는 <strong className="text-gray-800">{version}</strong> 판본이 없습니다. 있는 판본을 불러오는 중입니다…
          </p>
          {links}
        </>
      ) : list.length === 0 ? (
        <>
          <p className="mb-6 text-sm text-gray-600">
            {name}은(는) 본문을 확보하지 못한 법령이라 볼 수 있는 판본이 없습니다 (요청한 일자: {version}).
            알려진 개정 이력과 근거는 개정이력에서 볼 수 있습니다.
          </p>
          {links}
        </>
      ) : (
        <>
          <p className="mb-6 text-sm text-gray-600">
            {name}에는 <strong className="text-gray-800">{version}</strong> 판본이 없습니다.
            이 법령에 있는 판본 {list.length}개 가운데 골라 보세요.
            {nearest && <> 가장 가까운 판본은 <strong className="text-gray-800">{nearest}</strong>입니다.</>}
          </p>
          <ul className="mb-6 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {list.map((v) => {
              const near = v.version_date === nearest;
              const label = v.provenance?.label ?? v.source_desc?.label ?? null;
              return (
                <li key={v.id} className={near ? "bg-amber-50" : undefined}>
                  <a
                    href={`${lawHref}?version=${encodeURIComponent(v.version_date)}`}
                    className={`flex flex-wrap items-center gap-2 px-4 py-3 text-sm hover:bg-gray-50 ${near ? "border-l-4 border-amber-500 font-semibold" : ""}`}
                    aria-current={near ? "true" : undefined}
                  >
                    <span className="font-mono text-navy">{v.version_date}</span>
                    {v.action && <span className="text-gray-500">{v.action}</span>}
                    {label && <span className="text-gray-500">· {label}</span>}
                    {near && <span className="rounded bg-amber-200 px-1.5 py-0.5 text-xs font-medium text-amber-900">가장 가까운 판본</span>}
                    {before && v.version_date === before && before !== nearest && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">그 일자 직전 판본</span>
                    )}
                    {v.version_date === latest && <span className="rounded bg-navy/10 px-1.5 py-0.5 text-xs font-medium text-navy">최신</span>}
                  </a>
                </li>
              );
            })}
          </ul>
          {links}
        </>
      )}
    </section>
  );
}
