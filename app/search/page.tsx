"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCategories, searchLaws } from "@/lib/api";
import type { RefData, SearchResultItem } from "@/lib/types";
import { SEARCH_EXAMPLES } from "@/lib/showcase";
import { track } from "@/lib/track";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import Highlight from "@/components/Highlight";
import ProvenanceBadges from "@/components/ProvenanceBadges";

/** 검색어가 없을 때(T42): 빈 화면 대신 예시 검색어와 분야별 목록(홈에서 옮겨 옴) */
function Browse() {
  const [ref, setRef] = useState<RefData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchCategories().then(setRef).catch(() => setFailed(true));
  }, []);
  const categories = ref ? [...ref.categories].sort((a, b) => b.count - a.count) : [];
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">예시 검색어</p>
        <div className="flex flex-wrap gap-2">
          {SEARCH_EXAMPLES.map((w) => (
            <Link
              key={w}
              href={`/search?q=${encodeURIComponent(w)}&mode=hybrid`}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition-colors hover:border-navy-light hover:text-navy-light"
            >
              {w}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-800">
          분야별 법령{ref ? <span className="ml-2 text-sm font-normal text-gray-500">총 {ref.total_laws}건</span> : null}
        </h2>
        {failed && <p className="text-sm text-gray-500">분야 목록을 불러올 수 없습니다.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.category}
              href={`/category/${encodeURIComponent(cat.category)}`}
              className="group flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="font-medium text-navy group-hover:underline">{cat.category}</span>
              <span className="text-sm text-gray-500">{cat.count}건</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const mode = searchParams.get("mode") || "hybrid";
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
    if (page === 1) track("search", { query: q }); // T43 이용 기록(익명) — 쪽 넘김은 세지 않는다
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
      <h1 className="mb-1 text-2xl font-bold text-gray-800">법령 찾기</h1>
      <p className="mb-5 text-sm text-gray-500">법령명·조문 내용으로 찾거나, 아래 분야별 목록에서 둘러보세요.</p>
      <SearchBar initialQuery={q} initialMode={mode} />
      <p className="mt-2 text-xs text-gray-400">키워드: 글자 그대로 · 시맨틱: 뜻이 가까운 조문 · 하이브리드: 둘을 합친 결과(기본)</p>

      <div className="mt-8">
        {!q && <Browse />}
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
                    <span>검색: {r.source}</span>
                    {/* T7: 데이터 출처 라벨·미검증 OCR (r.source 는 검색 경로라 별도) */}
                    <ProvenanceBadges p={r.provenance} size="xs" linkSource={false} />
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
