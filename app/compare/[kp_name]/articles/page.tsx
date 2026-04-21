"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { fetchCompareArticles, fetchCompareDetail } from "@/lib/api";

interface ArticlePair {
  kp_article_number?: string;
  kp_article_title?: string;
  kp_content?: string;
  kr_article_number?: string;
  kr_article_title?: string;
  kr_content?: string;
  similarity?: number | null;
}

function ArticlesContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const kpName = decodeURIComponent(params.kp_name as string);
  const krNameParam = searchParams.get("kr_name");

  const [krName, setKrName] = useState(krNameParam || "");
  const [pairs, setPairs] = useState<ArticlePair[]>([]);
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
        const articles: ArticlePair[] = data.pairs || data.articles || data || [];
        setPairs(Array.isArray(articles) ? articles : []);
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
      ) : pairs.length === 0 ? (
        <div className="py-20 text-center text-gray-400">조문 비교 데이터가 없습니다.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-navy-light text-white">
                <th className="w-[45%] px-4 py-3 text-left font-semibold">북한 조문</th>
                <th className="w-[45%] px-4 py-3 text-left font-semibold">남한 조문</th>
                <th className="w-[10%] px-4 py-3 text-right font-semibold">유사도</th>
              </tr>
            </thead>
            <tbody>
              {pairs.map((pair, i) => (
                <tr key={i} className="border-b border-gray-100 align-top transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {pair.kp_article_number && (
                      <p className="mb-1 font-semibold text-navy">
                        제{pair.kp_article_number}조
                        {pair.kp_article_title ? ` (${pair.kp_article_title})` : ""}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-gray-600">{pair.kp_content || "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {pair.kr_article_number && (
                      <p className="mb-1 font-semibold text-red-700">
                        제{pair.kr_article_number}조
                        {pair.kr_article_title ? ` (${pair.kr_article_title})` : ""}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-gray-600">{pair.kr_content || "-"}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {pair.similarity != null ? (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          pair.similarity >= 0.8
                            ? "bg-green-100 text-green-700"
                            : pair.similarity >= 0.5
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-600"
                        }`}
                      >
                        {(pair.similarity * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
