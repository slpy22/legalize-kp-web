"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { searchLaws } from "@/lib/api";
import type { SearchResultItem } from "@/lib/types";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import Highlight from "@/components/Highlight";

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const mode = searchParams.get("mode") || "keyword";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!q) {
      setResults([]);
      setTotal(0);
      setTotalPages(1);
      setSearched(false);
      return;
    }
    setLoading(true);
    searchLaws(q, mode, page, 10)
      .then(({ data, meta }) => {
        setResults(data.results);
        setTotal(meta.total);
        setTotalPages(meta.total_pages);
        setSearched(true);
      })
      .catch(() => {
        setResults([]);
        setTotal(0);
        setTotalPages(1);
        setSearched(true);
      })
      .finally(() => setLoading(false));
  }, [q, mode, page]);

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    params.set("q", q);
    params.set("mode", mode);
    params.set("page", String(newPage));
    router.push(`/search?${params.toString()}`);
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">법령 검색</h1>

      <SearchBar initialQuery={q} initialMode={mode} />

      <div className="mt-8">
        {loading && (
          <p className="text-center text-gray-500">검색 중...</p>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-center text-gray-500">
            &ldquo;{q}&rdquo;에 대한 검색 결과가 없습니다.
          </p>
        )}

        {!loading && results.length > 0 && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              총 {total}건 (페이지 {page}/{totalPages})
            </p>
            <div className="space-y-4">
              {results.map((r) => (
                <Link
                  key={r.law_name}
                  href={`/law/${encodeURIComponent(r.law_name)}`}
                  className="group block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-navy-light hover:shadow-md"
                >
                  <h3 className="font-semibold text-navy-light group-hover:underline">
                    <Highlight text={r.law_name} query={q} />
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
                    <span>{r.category}</span>
                    <span>
                      유사도: {(r.score * 100).toFixed(1)}%
                    </span>
                    <span>소스: {r.source}</span>
                  </div>
                  {/* 매칭 조문 스니펫 */}
                  {r.matching_articles && r.matching_articles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {r.matching_articles.slice(0, 2).map((ma) => (
                        <p
                          key={ma.id}
                          className="text-sm text-gray-600 line-clamp-2"
                        >
                          <span className="font-medium">
                            제{ma.article_number}조
                          </span>{" "}
                          <Highlight
                            text={
                              ma.content.length > 150
                                ? ma.content.slice(0, 150) + "..."
                                : ma.content
                            }
                            query={q}
                          />
                        </p>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
