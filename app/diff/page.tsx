"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  fetchLawVersions,
  fetchDiffText,
  fetchHistory,
} from "@/lib/api";
import type {
  LawVersionMeta,
  DiffTextData,
  Article,
  Amendment,
} from "@/lib/types";
import ArticleDiff from "@/components/ArticleDiff";

interface DiffPair {
  article_number: string;
  from?: Article;
  to?: Article;
}

function classifyPairs(diffData: DiffTextData) {
  const fromByNum = new Map<string, Article>();
  for (const a of diffData.from.articles) {
    fromByNum.set(String(a.article_number), a);
  }
  const toByNum = new Map<string, Article>();
  for (const a of diffData.to.articles) {
    toByNum.set(String(a.article_number), a);
  }

  const added: DiffPair[] = [];
  const removed: DiffPair[] = [];
  const modified: DiffPair[] = [];
  const same: DiffPair[] = [];

  const allNums = new Set<string>([
    ...fromByNum.keys(),
    ...toByNum.keys(),
  ]);
  // 숫자 우선 정렬
  const sorted = Array.from(allNums).sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });

  for (const n of sorted) {
    const f = fromByNum.get(n);
    const t = toByNum.get(n);
    const pair: DiffPair = { article_number: n, from: f, to: t };
    if (!f && t) added.push(pair);
    else if (f && !t) removed.push(pair);
    else if (f && t && (f.content ?? "") !== (t.content ?? ""))
      modified.push(pair);
    else same.push(pair);
  }
  return { added, removed, modified, same };
}

function DiffContent() {
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") || "";

  const [name, setName] = useState(initialName);
  const [versions, setVersions] = useState<LawVersionMeta[]>([]);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [diffData, setDiffData] = useState<DiffTextData | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buckets = useMemo(
    () => (diffData ? classifyPairs(diffData) : null),
    [diffData]
  );

  async function loadMeta() {
    if (!name.trim()) return;
    setError("");
    setLoaded(false);
    setVersions([]);
    setAmendments([]);
    setDiffData(null);
    try {
      const [vResp, hResp] = await Promise.all([
        fetchLawVersions(name.trim()),
        fetchHistory(name.trim()).catch(() => ({
          law_name: name,
          amendments: [],
        })),
      ]);
      const vs = vResp.versions || [];
      setVersions(vs);
      setAmendments(hResp.amendments || []);
      setLoaded(true);
      if (vs.length >= 2) {
        const sorted = [...vs].sort((a, b) =>
          (a.version_date || "").localeCompare(b.version_date || "")
        );
        setDate1(sorted[0].version_date);
        setDate2(sorted[sorted.length - 1].version_date);
      }
    } catch {
      setError("법령 정보를 불러올 수 없습니다.");
    }
  }

  useEffect(() => {
    if (initialName) loadMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runDiff() {
    if (!date1 || !date2 || date1 === date2) return;
    setLoading(true);
    setError("");
    setDiffData(null);
    try {
      const d = await fetchDiffText(name.trim(), date1, date2);
      setDiffData(d);
    } catch {
      setError("비교 결과를 가져올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  const sortedVersions = useMemo(
    () =>
      [...versions].sort((a, b) =>
        (a.version_date || "").localeCompare(b.version_date || "")
      ),
    [versions]
  );

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">신구대조</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-800">신구대조</h1>

      {/* 법령명 입력 */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="법령명을 입력하세요 (예: 조선민주주의인민공화국 헌법)"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
          onKeyDown={(e) => e.key === "Enter" && loadMeta()}
        />
        <button
          onClick={loadMeta}
          className="shrink-0 rounded-lg bg-navy-light px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy"
        >
          버전 불러오기
        </button>
      </div>

      {/* 시점 선택 */}
      {loaded && versions.length >= 2 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                이전 시점
              </label>
              <select
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {sortedVersions.map((v) => (
                  <option key={`f-${v.id}`} value={v.version_date}>
                    {v.version_date}
                    {v.source ? ` [${v.source}]` : ""}
                  </option>
                ))}
              </select>
            </div>
            <span className="pb-2 text-gray-400">&rarr;</span>
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                새 시점
              </label>
              <select
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {sortedVersions.map((v) => (
                  <option key={`t-${v.id}`} value={v.version_date}>
                    {v.version_date}
                    {v.source ? ` [${v.source}]` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={runDiff}
              disabled={loading || date1 === date2}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "비교 중..." : "조문 단위 비교"}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * 본문이 적재된 버전만 표시됩니다. 본문이 없는 옛 개정(채택 직후 등)은 셀렉터에 없을 수 있습니다.
          </p>
        </div>
      )}

      {loaded && versions.length < 2 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          본문이 적재된 버전이 2건 미만이라 비교할 수 없습니다.
          {amendments.length > 1 &&
            ` (개정 메타는 ${amendments.length}건 존재 — 본문은 일부만 보유)`}
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* 결과 */}
      {diffData && buckets && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">
              {diffData.law_name}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {diffData.from.version_date}
              {diffData.from.source ? ` [${diffData.from.source}]` : ""}
              {" → "}
              {diffData.to.version_date}
              {diffData.to.source ? ` [${diffData.to.source}]` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                신설 {buckets.added.length}
              </span>
              <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-800">
                삭제 {buckets.removed.length}
              </span>
              <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
                변경 {buckets.modified.length}
              </span>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">
                동일 {buckets.same.length}
              </span>
            </div>
            {buckets.same.length > 0 && (
              <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showUnchanged}
                  onChange={(e) => setShowUnchanged(e.target.checked)}
                />
                변경 없는 조문도 표시 ({buckets.same.length}개)
              </label>
            )}
          </div>

          {buckets.added.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-emerald-700">
                신설 조문
              </h3>
              <div className="space-y-3">
                {buckets.added.map((p) => (
                  <ArticleDiff
                    key={`a-${p.article_number}`}
                    from={null}
                    to={p.to}
                  />
                ))}
              </div>
            </div>
          )}

          {buckets.removed.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-rose-700">
                삭제 조문
              </h3>
              <div className="space-y-3">
                {buckets.removed.map((p) => (
                  <ArticleDiff
                    key={`r-${p.article_number}`}
                    from={p.from}
                    to={null}
                  />
                ))}
              </div>
            </div>
          )}

          {buckets.modified.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-amber-700">
                변경 조문
              </h3>
              <div className="space-y-3">
                {buckets.modified.map((p) => (
                  <ArticleDiff
                    key={`m-${p.article_number}`}
                    from={p.from}
                    to={p.to}
                  />
                ))}
              </div>
            </div>
          )}

          {showUnchanged && buckets.same.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold text-gray-600">
                동일 조문
              </h3>
              <div className="space-y-3">
                {buckets.same.map((p) => (
                  <ArticleDiff
                    key={`s-${p.article_number}`}
                    from={p.from}
                    to={p.to}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default function DiffPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      }
    >
      <DiffContent />
    </Suspense>
  );
}
