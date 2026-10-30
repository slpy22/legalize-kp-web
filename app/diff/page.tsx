"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { fetchLawVersions, fetchDiffSemantic, fetchDiffReport } from "@/lib/api";
import type {
  LawVersionMeta,
  SemanticDiffData,
  DiffKind,
  DiffReportData,
} from "@/lib/types";
import SideBySideDiff from "@/components/SideBySideDiff";
import { DIFF_QUICK_PICKS, diffHref } from "@/lib/showcase";
import { track } from "@/lib/track";

function DiffContent() {
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") || "";
  // T42: ?date1=&date2= 가 함께 오면 판본을 불러온 뒤 바로 비교한다(홈·대표 비교 바로가기)
  const qDate1 = searchParams.get("date1") || "";
  const qDate2 = searchParams.get("date2") || "";

  const [name, setName] = useState(initialName);
  const [versions, setVersions] = useState<LawVersionMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [diff, setDiff] = useState<SemanticDiffData | null>(null);
  const [showSame, setShowSame] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<DiffReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  async function loadVersions(lawName = name, want1 = "", want2 = "") {
    if (!lawName.trim()) return;
    setError("");
    setLoaded(false);
    setVersions([]);
    setDiff(null);
    setReport(null);
    try {
      const resp = await fetchLawVersions(lawName.trim());
      const vs = resp.versions || [];
      setVersions(vs);
      setLoaded(true);
      if (vs.length >= 2) {
        const sorted = [...vs].sort((a, b) =>
          (a.version_date || "").localeCompare(b.version_date || "")
        );
        const has = (d: string) => sorted.some((v) => v.version_date === d);
        // 주소로 받은 시점이 보유 판본이면 그대로, 아니면 처음·마지막 판본
        const d1 = has(want1) ? want1 : sorted[0].version_date;
        const d2 = has(want2) ? want2 : sorted[sorted.length - 1].version_date;
        setDate1(d1);
        setDate2(d2);
        if (has(want1) && has(want2) && want1 !== want2) await runDiff(lawName, want1, want2);
      }
    } catch {
      setError("법령 정보를 불러올 수 없습니다.");
    }
  }

  // 주소(name·date1·date2)가 바뀔 때마다 — 같은 페이지 안의 대표 비교 바로가기도 여기로 온다
  useEffect(() => {
    if (!initialName) return;
    setName(initialName);
    loadVersions(initialName, qDate1, qDate2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName, qDate1, qDate2]);

  async function runDiff(lawName = name, d1 = date1, d2 = date2) {
    if (!d1 || !d2 || d1 === d2) return;
    setLoading(true);
    setError("");
    setDiff(null);
    setReport(null);
    try {
      const d = await fetchDiffSemantic(lawName.trim(), d1, d2);
      setDiff(d);
      track("diff", { law: d.law_name }); // T43 이용 기록(익명)
    } catch {
      setError("비교 결과를 가져올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function runReport() {
    if (!date1 || !date2 || date1 === date2) return;
    setReportLoading(true);
    setError("");
    try {
      const r = await fetchDiffReport(name.trim(), date1, date2);
      setReport(r);
    } catch {
      setError("리포트를 생성할 수 없습니다.");
    } finally {
      setReportLoading(false);
    }
  }

  const sortedVersions = useMemo(
    () =>
      [...versions].sort((a, b) =>
        (a.version_date || "").localeCompare(b.version_date || "")
      ),
    [versions]
  );

  // 표시 순서: 변경 → 신설 → 삭제 → (동일)
  const orderedPairs = useMemo(() => {
    if (!diff) return [];
    const order: Record<DiffKind, number> = {
      modified: 0,
      added: 1,
      removed: 2,
      same: 3,
    };
    return [...diff.pairs]
      .filter((p) => showSame || p.kind !== "same")
      .sort((a, b) => order[a.kind] - order[b.kind]);
  }, [diff, showSame]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        {(() => {
          // 선택(불러오기 완료 또는 비교 결과)된 법률명 — 정식 명칭 우선
          const crumb = diff?.law_name || (loaded ? name.trim() : "");
          if (!crumb) return null;
          return (
            <>
              <Link
                href={`/law/${encodeURIComponent(crumb)}`}
                className="hover:text-navy-light"
              >
                {crumb}
              </Link>
              <span className="mx-2">/</span>
            </>
          );
        })()}
        <span className="font-medium text-gray-800">신구비교</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-800">신구비교</h1>
      <p className="mb-6 text-sm text-gray-500">
        두 판본의 조문을 의미(임베딩 유사도)로 짝지어 신설·삭제·변경을 찾고, 변경된 조항은 좌우 본문에서 달라진 부분을 강조합니다.
        결과에서 AI 변화 리포트도 만들 수 있습니다.
      </p>

      {/* 법령명 입력 */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="법령명을 입력하세요 (예: 조선민주주의인민공화국 헌법)"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
          onKeyDown={(e) => e.key === "Enter" && loadVersions()}
        />
        <button
          onClick={() => loadVersions()}
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
              <label className="mb-1 block text-sm text-gray-600">이전 시점</label>
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
              <label className="mb-1 block text-sm text-gray-600">새 시점</label>
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
              onClick={() => runDiff()}
              disabled={loading || date1 === date2}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "비교 중..." : "의미 기반 비교"}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * 본문이 적재된 버전만 비교할 수 있습니다.
          </p>
        </div>
      )}

      {/* 빈 첫 화면(T42): 사용법과 대표 비교 바로가기 */}
      {!initialName && !loaded && !diff && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <ol className="flex flex-col gap-2 text-sm text-gray-700 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <li><span className="mr-1.5 font-bold text-navy-light">1</span>법령 선택</li>
            <li><span className="mr-1.5 font-bold text-navy-light">2</span>비교할 두 시점 선택</li>
            <li><span className="mr-1.5 font-bold text-navy-light">3</span>의미 기반 비교</li>
            <li><span className="mr-1.5 font-bold text-navy-light">4</span>(선택) AI 변화 리포트</li>
          </ol>
          <p className="mt-4 text-sm font-semibold text-gray-800">대표 비교 — 누르면 바로 결과가 나옵니다</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFF_QUICK_PICKS.map((q) => (
              <Link
                key={q.label}
                href={diffHref(q.name, q.date1, q.date2)}
                className="rounded-full border border-navy-light/40 bg-navy-light/5 px-3.5 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy-light hover:text-white"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {loaded && versions.length < 2 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          본문이 적재된 버전이 2건 미만이라 비교할 수 없습니다.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {loading && (
        <p className="mb-4 rounded-lg bg-navy-light/5 px-4 py-3 text-sm text-navy" role="status">
          두 판본을 의미로 짝짓는 중입니다… (조문 수에 따라 몇 초 걸릴 수 있습니다)
        </p>
      )}

      {/* 결과 */}
      {diff && (
        <div className="space-y-4">
          {/* 요약 헤더 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">{diff.law_name}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {diff.from.version_date}
              {diff.from.source ? ` [${diff.from.source}]` : ""} {" → "}
              {diff.to.version_date}
              {diff.to.source ? ` [${diff.to.source}]` : ""}
              {diff.method === "semantic" ? " · 의미 매칭" : " · 조문번호 매칭"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
                변경 {diff.summary.modified}
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                신설 {diff.summary.added}
              </span>
              <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-800">
                삭제 {diff.summary.removed}
              </span>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">
                동일 {diff.summary.same}
              </span>
            </div>
            {diff.summary.same > 0 && (
              <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showSame}
                  onChange={(e) => setShowSame(e.target.checked)}
                />
                변경 없는 조문도 표시 ({diff.summary.same}개)
              </label>
            )}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <button
                onClick={runReport}
                disabled={reportLoading}
                className="rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
              >
                {reportLoading ? "리포트 생성 중…" : "📄 의미론적 변화 리포트 생성"}
              </button>
              <span className="ml-2 text-xs text-gray-400">
                변경·신설·삭제를 영역별로 종합 분석합니다
              </span>
            </div>
          </div>

          {/* 의미론적 변화 리포트 */}
          {report && (
            <div className="rounded-lg border border-navy-light/30 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <h2 className="text-lg font-bold text-navy">변화 리포트</h2>
                <span className="text-xs text-gray-500">
                  {report.from.version_date} → {report.to.version_date} · AI 종합 분석
                </span>
              </div>
              <article className="prose prose-sm max-w-none prose-headings:text-navy prose-h2:mt-5 prose-h2:text-base prose-strong:text-gray-900">
                <ReactMarkdown>{report.report}</ReactMarkdown>
              </article>
              <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                * 이 리포트는 조문 변화 데이터를 AI가 의미론적으로 종합한 것으로, 참고용입니다. 정확한 내용은 원문 조항을 확인하세요.
              </p>
            </div>
          )}

          {/* 좌우 비교 카드 목록 */}
          <div className="space-y-3">
            {orderedPairs.map((p, i) => (
              <SideBySideDiff
                key={`${p.kind}-${p.from?.article_number ?? ""}-${p.to?.article_number ?? ""}-${i}`}
                pair={p}
              />
            ))}
          </div>
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
