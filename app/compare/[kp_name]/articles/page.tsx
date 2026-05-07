"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { fetchCompareArticles, fetchCompareDetail } from "@/lib/api";

interface ArticlePair {
  article?: string;        // "제1조"
  kp?: { number?: string; title?: string; content?: string };
  kr?: { number?: string; title?: string; content?: string };
  similarity?: number | null;
}

interface UnmatchedArticle {
  number?: string;
  title?: string;
  content?: string;
}

function ArticlesContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const kpName = decodeURIComponent(params.kp_name as string);
  const krNameParam = searchParams.get("kr_name");

  const [krName, setKrName] = useState(krNameParam || "");
  const [pairs, setPairs] = useState<ArticlePair[]>([]);
  const [kpUnmatched, setKpUnmatched] = useState<UnmatchedArticle[]>([]);
  const [krUnmatched, setKrUnmatched] = useState<UnmatchedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        let resolvedKr = krNameParam || "";
        // If no kr_name in query, fetch from detail
        if (!resolvedKr) {
          const detail = await fetchCompareDetail(kpName);
          resolvedKr = detail?.kr_name || "";
        }
        setKrName(resolvedKr);

        if (!resolvedKr) {
          setError("매핑된 남한법이 없습니다.");
          setLoading(false);
          return;
        }

        const data = await fetchCompareArticles(kpName, resolvedKr);
        setPairs(Array.isArray(data.article_pairs) ? data.article_pairs : []);
        setKpUnmatched(Array.isArray(data.kp_unmatched) ? data.kp_unmatched : []);
        setKrUnmatched(Array.isArray(data.kr_unmatched) ? data.kr_unmatched : []);
      } catch {
        setError("조문 비교 데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [kpName, krNameParam]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-navy-light">남북법비교</Link>
        <span className="mx-2">/</span>
        <Link href={`/compare/${encodeURIComponent(kpName)}`} className="hover:text-navy-light">{kpName}</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">조문 비교</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-800">조문 비교</h1>
      <p className="mb-6 text-sm text-gray-500">
        {kpName} {krName ? `↔ ${krName}` : ""}
      </p>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      ) : pairs.length === 0 && kpUnmatched.length === 0 && krUnmatched.length === 0 ? (
        <div className="py-20 text-center text-gray-400">조문 비교 데이터가 없습니다.</div>
      ) : (
        <>
          {/* 매칭된 조문 */}
          {pairs.length > 0 && (
            <div className="mb-8 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
                매칭된 조문 ({pairs.length}개)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-navy-light text-white">
                    <th className="w-[10%] px-4 py-3 text-center font-semibold">조문</th>
                    <th className="w-[45%] px-4 py-3 text-left font-semibold">북한</th>
                    <th className="w-[45%] px-4 py-3 text-left font-semibold">남한</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair, i) => (
                    <tr key={i} className="border-b border-gray-100 align-top transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-center font-mono text-xs text-gray-500">
                        {pair.article || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {pair.kp?.title && (
                          <p className="mb-1 text-xs font-semibold text-navy">{pair.kp.title}</p>
                        )}
                        <p className="whitespace-pre-wrap text-gray-600">{pair.kp?.content || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {pair.kr?.title && (
                          <p className="mb-1 text-xs font-semibold text-red-700">{pair.kr.title}</p>
                        )}
                        <p className="whitespace-pre-wrap text-gray-600">{pair.kr?.content || "-"}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 북한법에만 있는 조문 */}
          {kpUnmatched.length > 0 && (
            <div className="mb-8 overflow-x-auto rounded-lg border border-blue-200 bg-white shadow-sm">
              <h2 className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                북한법에만 있는 조문 ({kpUnmatched.length}개)
              </h2>
              <div className="divide-y divide-gray-100">
                {kpUnmatched.map((a, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="mb-1 text-xs font-semibold text-navy">
                      제{a.number}조 {a.title || ""}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-600">{a.content || ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 남한법에만 있는 조문 */}
          {krUnmatched.length > 0 && (
            <div className="mb-8 overflow-x-auto rounded-lg border border-red-200 bg-white shadow-sm">
              <h2 className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                남한법에만 있는 조문 ({krUnmatched.length}개)
              </h2>
              <div className="divide-y divide-gray-100">
                {krUnmatched.map((a, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="mb-1 text-xs font-semibold text-red-700">
                      {a.number} {a.title || ""}
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-600">{a.content || ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function ArticlesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <ArticlesContent />
    </Suspense>
  );
}
