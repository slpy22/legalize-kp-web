"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { fetchMappings } from "@/lib/api";
import Pagination from "@/components/Pagination";

interface MappingRow {
  kp_name: string;
  kp_category: string;
  kr_names: string[];
  relationship: string | null;
  confidence: string | null;
}

const RELATIONSHIP_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  equivalent: { bg: "bg-green-100", text: "text-green-700", label: "동일" },
  partial:    { bg: "bg-yellow-100", text: "text-yellow-700", label: "부분일치" },
  related:    { bg: "bg-gray-100", text: "text-gray-600", label: "관련" },
  none:       { bg: "bg-red-100", text: "text-red-500", label: "무관" },
};

function RelBadge({ rel }: { rel: string | null }) {
  const badge = RELATIONSHIP_BADGE[rel || "related"] || RELATIONSHIP_BADGE.related;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
}

function MappingList() {
  const [rows, setRows] = useState<MappingRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [selectedCat, searchQuery, page]);

  function handleCategoryChange(cat: string) {
    setSelectedCat(cat);
    setPage(1);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPage(1);
  }

  function handleClearSearch() {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  }

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const { data, meta } = await fetchMappings(selectedCat || undefined, page, 10, searchQuery || undefined);
      const mappings: MappingRow[] = data.mappings || data.results || data || [];
      setRows(Array.isArray(mappings) ? mappings : []);
      setTotal(meta.total);
      setTotalPages(meta.total_pages);
      // extract unique categories for filter (only on first load without filter)
      if (!selectedCat && page === 1 && Array.isArray(mappings)) {
        // Fetch all to get categories — use a separate request with large per_page
        const { data: allData } = await fetchMappings(undefined, 1, 500);
        const allMappings = allData.mappings || [];
        const cats = [...new Set(allMappings.map((r: MappingRow) => r.kp_category).filter(Boolean))] as string[];
        setCategories(cats.sort());
      }
    } catch {
      setError("매핑 데이터를 불러올 수 없습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">남북법비교</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">남북법 매핑 목록</h1>
        <div className="flex gap-3">
          <Link
            href="/compare/terms"
            className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
          >
            용어 대조표
          </Link>
        </div>
      </div>

      {/* 검색 + 카테고리 필터 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="북한법명 또는 남한법명 검색..."
            className="w-64 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
          />
          <button
            type="submit"
            className="rounded-lg bg-navy-light px-4 py-2 text-sm font-medium text-white hover:bg-navy transition-colors"
          >
            검색
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              초기화
            </button>
          )}
        </form>
        <select
          value={selectedCat}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
        >
          <option value="">전체 카테고리</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {searchQuery && (
        <p className="mb-4 text-sm text-gray-500">
          &ldquo;{searchQuery}&rdquo; 검색 결과: {total}건
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      ) : rows.length === 0 ? (
        <div className="py-20 text-center text-gray-400">매핑 데이터가 없습니다.</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-navy-light text-white">
                  <th className="px-4 py-3 text-left font-semibold">북한법명</th>
                  <th className="px-4 py-3 text-left font-semibold">카테고리</th>
                  <th className="px-4 py-3 text-left font-semibold">대응 남한법</th>
                  <th className="px-4 py-3 text-center font-semibold">관계</th>
                  <th className="px-4 py-3 text-right font-semibold">확신도</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const krNames = Array.isArray(row.kr_names) ? row.kr_names : [];
                  return (
                    <tr
                      key={row.kp_name + i}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/compare/${encodeURIComponent(row.kp_name)}`}
                          className="font-medium text-navy hover:underline"
                        >
                          {row.kp_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.kp_category}</td>
                      <td className="px-4 py-3">
                        {krNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {krNames.map((name, j) => (
                              <span
                                key={j}
                                className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">미매핑</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RelBadge rel={row.relationship} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.confidence ? (
                          <span className="text-xs text-gray-600">{row.confidence}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <MappingList />
    </Suspense>
  );
}
