"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCategories, fetchLawResolve, searchLaws } from "@/lib/api";
import type { RefData, SearchResultItem } from "@/lib/types";
import { SEARCH_EXAMPLES } from "@/lib/showcase";
import { track } from "@/lib/track";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import Highlight from "@/components/Highlight";
import ProvenanceBadges from "@/components/ProvenanceBadges";
import LawYears from "@/components/LawYears";
import { useLawIndex } from "@/components/LawNameInput";
import LawSuggestBox, { type LawSuggestions } from "@/components/LawSuggestBox";
import CategoryGrid from "@/components/CategoryGrid";
import { looksLikeLawName, pickSuggestions } from "@/lib/versionMiss";

/** 검색어가 없을 때(T42): 빈 화면 대신 예시 검색어와 분야별 목록(홈에서 옮겨 옴) */
function Browse() {
  const [ref, setRef] = useState<RefData | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchCategories().then(setRef).catch(() => setFailed(true));
  }, []);
  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700">예시 검색어</p>
        <div className="flex flex-wrap gap-2">
          {SEARCH_EXAMPLES.map((w) => (
            <Link
              prefetch={false}
              key={w}
              href={`/search?q=${encodeURIComponent(w)}&mode=hybrid`}
              className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-sm text-gray-700 transition-colors hover:border-navy-light hover:text-navy-light"
            >
              {w}
            </Link>
          ))}
        </div>
      </div>
      <CategoryGrid data={ref} failed={failed} />
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
  // T50 ⑥: 결과마다 "2008 채택 · 2024 개정" — 검색 응답에는 연도가 없어 법령 색인에서 찾는다
  const lawIndex = useLawIndex();
  const yearsOf = (name: string) => lawIndex.find((e) => e.n === name);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  // T100: 검색어가 법령 이름 꼴인데 이름이 정확히 같은 법령이 없으면 결과 위에 '찾으시는 법령이 혹시…'(404 와 같은 resolve 후보).
  //       검색어가 바뀔 때만 묻는다(쪽 넘김은 다시 묻지 않음). 조문 내용 검색어('산업'·'토지')는 묻지 않는다.
  //       후보에 검색어를 붙여 두고 지금 검색어의 것만 보인다(검색어가 바뀌면 이전 후보는 저절로 사라진다).
  const [sugg, setSugg] = useState<{ q: string; s: LawSuggestions } | null>(null);
  useEffect(() => {
    if (!q || !looksLikeLawName(q)) return;
    let alive = true;
    fetchLawResolve(q)
      .then((r) => alive && setSugg({ q, s: pickSuggestions(r, q.trim()) }))
      .catch(() => alive && setSugg(null));
    return () => {
      alive = false;
    };
  }, [q]);

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
        {q && sugg?.q === q && <LawSuggestBox sugg={sugg.s} kind="search" className="mb-6" />}
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
                  prefetch={false}
                  key={r.law_name}
                  href={`/law/${encodeURIComponent(r.law_name)}`}
                  className="group block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-navy-light hover:shadow-md"
                >
                  <h3 className="font-semibold text-navy-light group-hover:underline">
                    <Highlight text={r.law_name} query={q} />
                    {yearsOf(r.law_name)?.t && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-xs font-normal text-amber-800">본문 미확보</span>}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
                    <LawYears adopted={yearsOf(r.law_name)?.y} latest={yearsOf(r.law_name)?.v} className="font-medium text-gray-600" />
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
