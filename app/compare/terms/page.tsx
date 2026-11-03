"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchCompareCategories, fetchCompareTerms } from "@/lib/api";
import { track } from "@/lib/track";
import Pagination from "@/components/Pagination";
import AutoNotice from "@/components/compare/AutoNotice";

interface TermRow {
  kp_term: string;
  kr_term: string;
  category: string;
  verified?: boolean;
}

function TermsContent() {
  // T42: ?q=<용어> 로 오면 그 용어로 바로 찾는다(홈의 용어 칩)
  const q = useSearchParams().get("q") || "";
  const [rows, setRows] = useState<TermRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [searchQuery, setSearchQuery] = useState(q);
  const [debouncedQuery, setDebouncedQuery] = useState(q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // reset page on new search
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  function handleCategoryChange(cat: string) {
    setSelectedCat(cat);
    setPage(1);
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (debouncedQuery.trim() && page === 1) track("terms", { query: debouncedQuery.trim() }); // T43 이용 기록(익명)
      const { data, meta } = await fetchCompareTerms(
        debouncedQuery || undefined,
        selectedCat || undefined,
        page,
        10,
      );
      const terms: TermRow[] = data.terms || data.results || data || [];
      setRows(Array.isArray(terms) ? terms : []);
      setTotal(meta.total);
      setTotalPages(meta.total_pages);
      // extract categories on first load
      if (!selectedCat && !debouncedQuery && page === 1 && Array.isArray(terms)) {
        // T47: 분류 목록만 따로 받는다(바깥 요청은 per_page 50 까지)
        setCategories(await fetchCompareCategories("term"));
      }
    } catch {
      setError("용어 데이터를 불러올 수 없습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedCat, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link prefetch={false} href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <Link prefetch={false} href="/compare" className="hover:text-navy-light">남북비교</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">용어비교</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-800">남북 법용어 비교</h1>
      <p className="mb-6 text-sm text-gray-500">
        같은 제도를 남북이 다른 말로 부르는 경우가 많습니다. 북한 법률 용어와 대응하는 남한 용어를 찾아보세요(북한어·남한어 어느 쪽으로도 검색).
      </p>
      <AutoNotice className="mb-6" />

      {/* 검색 + 필터 */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="용어 검색 (북한어 또는 남한어)"
          className="min-w-[240px] flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
        />
        <select
          value={selectedCat}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
        >
          <option value="">전체 분류</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center text-gray-400">용어 데이터가 없습니다.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-navy-light text-white">
                  <th className="px-4 py-3 text-left font-semibold">북한어</th>
                  <th className="px-4 py-3 text-left font-semibold">남한어</th>
                  <th className="px-4 py-3 text-left font-semibold">분류</th>
                  {/* T57: '검수 완료'(verified)는 실제 검수 기록이 없는 일괄 표시라 내렸다(T49) */}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-medium text-navy">{row.kp_term}</td>
                    <td className="px-4 py-3 text-gray-800">{row.kr_term}</td>
                    <td className="px-4 py-3 text-gray-600">{row.category || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            총 {total}건 (페이지 {page}/{totalPages})
          </p>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}

export default function TermsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <TermsContent />
    </Suspense>
  );
}
