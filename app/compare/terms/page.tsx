"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fetchCompareTerms } from "@/lib/api";
import Pagination from "@/components/Pagination";

interface TermRow {
  kp_term: string;
  kr_term: string;
  category: string;
  verified?: boolean;
}

function TermsContent() {
  const [rows, setRows] = useState<TermRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
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
        const { data: allData } = await fetchCompareTerms(undefined, undefined, 1, 500);
        const allTerms = allData.terms || [];
        const cats = [...new Set(allTerms.map((r: TermRow) => r.category).filter(Boolean))] as string[];
        setCategories(cats.sort());
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
        <Link href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-navy-light">남북법비교</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">용어 대조표</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-800">남북 법률용어 대조표</h1>

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
                  <th className="px-4 py-3 text-center font-semibold">검수여부</th>
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
                    <td className="px-4 py-3 text-center">
                      {row.verified ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          완료
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                          미검수
                        </span>
                      )}
                    </td>
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
