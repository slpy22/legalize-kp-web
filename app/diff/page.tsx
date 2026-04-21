"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchHistory, fetchDiff } from "@/lib/api";
import type { Amendment, DiffData } from "@/lib/types";

function DiffContent() {
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") || "";

  const [name, setName] = useState(initialName);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [diffResult, setDiffResult] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* 이력 로드 */
  const loadHistory = async () => {
    if (!name.trim()) return;
    setError("");
    setAmendments([]);
    setDiffResult(null);
    setHistoryLoaded(false);
    try {
      const h = await fetchHistory(name.trim());
      setAmendments(h.amendments);
      setHistoryLoaded(true);
      if (h.amendments.length >= 2) {
        setDate1(h.amendments[0].date);
        setDate2(h.amendments[h.amendments.length - 1].date);
      }
    } catch {
      setError("이력을 불러올 수 없습니다.");
    }
  };

  /* initialName이 있으면 자동 로드 */
  useEffect(() => {
    if (initialName) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 비교 실행 */
  const runDiff = async () => {
    if (!date1 || !date2) return;
    setLoading(true);
    setError("");
    setDiffResult(null);
    try {
      const result = await fetchDiff(name.trim(), date1, date2);
      setDiffResult(result);
    } catch {
      setError("비교 결과를 가져올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
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
          placeholder="법령명을 입력하세요"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
          onKeyDown={(e) => e.key === "Enter" && loadHistory()}
        />
        <button
          onClick={loadHistory}
          className="shrink-0 rounded-lg bg-navy-light px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy"
        >
          이력 불러오기
        </button>
      </div>

      {/* 시점 선택 */}
      {historyLoaded && amendments.length >= 2 && (
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm text-gray-600">
              시작 시점
            </label>
            <select
              value={date1}
              onChange={(e) => setDate1(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {amendments.map((a) => (
                <option key={a.id} value={a.date}>
                  {a.date} ({a.action})
                </option>
              ))}
            </select>
          </div>
          <span className="pb-2 text-gray-400">&rarr;</span>
          <div>
            <label className="mb-1 block text-sm text-gray-600">끝 시점</label>
            <select
              value={date2}
              onChange={(e) => setDate2(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            >
              {amendments.map((a) => (
                <option key={a.id} value={a.date}>
                  {a.date} ({a.action})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={runDiff}
            disabled={loading}
            className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "비교 중..." : "비교하기"}
          </button>
        </div>
      )}

      {historyLoaded && amendments.length < 2 && (
        <p className="text-sm text-gray-500">
          개정 이력이 2건 미만이어서 비교할 수 없습니다.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* 결과 */}
      {diffResult && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-lg font-bold text-gray-800">
            {diffResult.law_name} 신구대조
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            {diffResult.date_range[0]} &rarr;{" "}
            {diffResult.date_range[diffResult.date_range.length - 1]}
          </p>
          <p className="mb-4 text-sm text-gray-600">
            해당 기간 개정 {diffResult.total}건
          </p>
          <div className="space-y-3">
            {diffResult.amendments.map((a) => (
              <div
                key={a.id}
                className="rounded border border-gray-100 bg-gray-50 p-3 text-sm"
              >
                <span className="font-semibold">{a.date}</span>{" "}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                    a.action === "채택" ? "bg-green-500" : "bg-navy-light"
                  }`}
                >
                  {a.action}
                </span>
                {a.basis && (
                  <p className="mt-1 text-gray-600">{a.basis}</p>
                )}
              </div>
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
