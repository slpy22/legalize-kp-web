"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchCompareDetail } from "@/lib/api";

interface ArticleMapping {
  kp?: string;        // API: "제1조(사명)"
  kp_article?: string; // 호환
  kr_article?: string;
  kr_law?: string;
  topic?: string;      // API: "목적 조항"
  description?: string; // 호환
  similarity?: string;
}

interface DetailData {
  kp_name: string;
  kr_names: string[];
  kr_categories: string[];
  kp_category: string;
  relationship: string | null;
  confidence: string | null;
  overlap_areas: string[];
  kp_unique: string[];
  kr_unique: string[];
  article_mappings: ArticleMapping[];
  kp_info: {
    name: string;
    enactment_date?: string | null;
    latest_version_date?: string | null;
    total_articles?: number | null;
    chapter_count?: number;
    category?: string;
    [key: string]: unknown;
  } | null;
  kr_info: {
    name: string;
    enactment_date?: string | null;
    latest_version_date?: string | null;
    total_articles?: number | null;
    chapter_count?: number;
    [key: string]: unknown;
  } | null;
  comparison?: {
    summary?: string;
    similarities?: string[];
    differences?: string[];
    [key: string]: unknown;
  } | null;
  // Backward compat
  kr_name?: string | null;
}

const RELATIONSHIP_LABEL: Record<string, { color: string; label: string }> = {
  equivalent: { color: "bg-green-100 text-green-700", label: "동일" },
  partial:    { color: "bg-yellow-100 text-yellow-700", label: "부분일치" },
  related:    { color: "bg-gray-100 text-gray-600", label: "관련" },
  none:       { color: "bg-red-100 text-red-500", label: "무관" },
};

function CompareDetailContent() {
  const params = useParams();
  const kpName = decodeURIComponent(params.kp_name as string);

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchCompareDetail(kpName);
        setData(result);
      } catch {
        setError("비교 상세 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [kpName]);

  if (loading) return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
  if (error) return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-navy-light">남북법비교</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">{kpName}</span>
      </nav>
      <p className="text-sm text-red-500">{error}</p>
    </section>
  );

  const kp = data?.kp_info;
  const kr = data?.kr_info;
  const krNames = Array.isArray(data?.kr_names) ? data.kr_names : (data?.kr_name ? [data.kr_name] : []);
  const overlapAreas = Array.isArray(data?.overlap_areas) ? data.overlap_areas : [];
  const kpUnique = Array.isArray(data?.kp_unique) ? data.kp_unique : [];
  const krUnique = Array.isArray(data?.kr_unique) ? data.kr_unique : [];
  const articleMappings = Array.isArray(data?.article_mappings) ? data.article_mappings : [];
  const relationship = data?.relationship || "related";
  const relInfo = RELATIONSHIP_LABEL[relationship] || RELATIONSHIP_LABEL.related;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <Link href="/compare" className="hover:text-navy-light">남북법비교</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">{kpName}</span>
      </nav>

      <div className="mb-2 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">상세 비교: {kpName}</h1>
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${relInfo.color}`}>
          {relInfo.label}
        </span>
      </div>
      {data?.kp_category && (
        <p className="mb-6 text-sm text-gray-500">카테고리: {data.kp_category}</p>
      )}

      {/* 좌우 카드: 북한법 (좌) + 남한법 카드들 (우) */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        {/* 북한법 */}
        <div className="rounded-lg border-2 border-navy-light bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-navy">
            북한: {kpName}
          </h2>
          {kp ? (
            <dl className="space-y-2 text-sm">
              {kp.enactment_date && (
                <div><dt className="text-gray-500">채택일</dt><dd className="font-medium">{kp.enactment_date}</dd></div>
              )}
              {kp.latest_version_date && (
                <div><dt className="text-gray-500">최신버전</dt><dd className="font-medium">{kp.latest_version_date}</dd></div>
              )}
              {kp.total_articles != null && (
                <div><dt className="text-gray-500">조문수</dt><dd className="font-medium">{kp.total_articles}조</dd></div>
              )}
              {kp.chapter_count != null && (
                <div><dt className="text-gray-500">장수</dt><dd className="font-medium">{kp.chapter_count}장</dd></div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">정보 없음</p>
          )}
        </div>

        {/* 남한법 카드(들) */}
        <div className="space-y-4">
          {krNames.length > 0 ? (
            krNames.map((name, idx) => (
              <div key={idx} className="rounded-lg border-2 border-accent bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-red-700">
                  남한: {name}
                </h2>
                {/* 첫 번째 남한법에만 kr_info 표시 (추후 개별 정보 확장 가능) */}
                {idx === 0 && kr ? (
                  <dl className="space-y-2 text-sm">
                    {kr.enactment_date && (
                      <div><dt className="text-gray-500">제정일</dt><dd className="font-medium">{kr.enactment_date}</dd></div>
                    )}
                    {kr.latest_version_date && (
                      <div><dt className="text-gray-500">최신시행일</dt><dd className="font-medium">{kr.latest_version_date}</dd></div>
                    )}
                    {kr.total_articles != null && (
                      <div><dt className="text-gray-500">조문수</dt><dd className="font-medium">{kr.total_articles}조</dd></div>
                    )}
                    {kr.chapter_count != null && (
                      <div><dt className="text-gray-500">장수</dt><dd className="font-medium">{kr.chapter_count}장</dd></div>
                    )}
                  </dl>
                ) : idx > 0 ? (
                  <p className="text-sm text-gray-400">상세 정보는 추후 확장 예정</p>
                ) : (
                  <p className="text-sm text-gray-400">남한법 정보를 불러올 수 없습니다.</p>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-400">남한: 미매핑</h2>
              <p className="text-sm text-gray-400">대응하는 남한법이 아직 매핑되지 않았습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 공통 규율 영역 / 북한 고유 / 남한 고유 */}
      {(overlapAreas.length > 0 || kpUnique.length > 0 || krUnique.length > 0) && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {/* 공통 규율 영역 */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-5">
            <h3 className="mb-3 text-sm font-bold text-green-800">공통 규율 영역</h3>
            {overlapAreas.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-green-700">
                {overlapAreas.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-green-500">없음</p>
            )}
          </div>

          {/* 북한법 고유 영역 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h3 className="mb-3 text-sm font-bold text-blue-800">북한법 고유 영역</h3>
            {kpUnique.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-blue-700">
                {kpUnique.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-blue-500">없음</p>
            )}
          </div>

          {/* 남한법 고유 영역 */}
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <h3 className="mb-3 text-sm font-bold text-red-800">남한법 고유 영역</h3>
            {krUnique.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm text-red-700">
                {krUnique.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-red-500">없음</p>
            )}
          </div>
        </div>
      )}

      {/* 조문 레벨 대응표 */}
      {articleMappings.length > 0 && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-gray-800">조문 대응표</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">북한법 조문</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">남한법</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">남한법 조문</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">설명</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">유사도</th>
                </tr>
              </thead>
              <tbody>
                {articleMappings.map((am, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-navy">{am.kp || am.kp_article || "-"}</td>
                    <td className="px-4 py-2 text-gray-600">{am.kr_law || "-"}</td>
                    <td className="px-4 py-2 font-mono text-red-700">{am.kr_article || "-"}</td>
                    <td className="px-4 py-2 text-gray-600">{am.topic || am.description || "-"}</td>
                    <td className="px-4 py-2 text-center text-gray-500">{am.similarity || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 비교 분석 */}
      {data?.comparison && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-gray-800">비교 분석</h2>
          {data.comparison.summary && (
            <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {data.comparison.summary}
            </p>
          )}
          {data.comparison.similarities && data.comparison.similarities.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 text-sm font-semibold text-green-700">유사점</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                {data.comparison.similarities.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {data.comparison.differences && data.comparison.differences.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-semibold text-red-600">차이점</h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-gray-600">
                {data.comparison.differences.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 하위 페이지 링크 — 각 남한법에 대해 개별 링크 */}
      {krNames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">세부 비교</h3>
          {krNames.map((krName, idx) => (
            <div key={idx} className="flex flex-wrap gap-3">
              <span className="flex items-center text-sm text-gray-500">{krName}:</span>
              <Link
                href={`/compare/${encodeURIComponent(kpName)}/articles?kr_name=${encodeURIComponent(krName)}`}
                className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
              >
                조문 비교
              </Link>
              <Link
                href={`/compare/${encodeURIComponent(kpName)}/structure?kr_name=${encodeURIComponent(krName)}`}
                className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
              >
                체계 비교
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CompareDetailPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <CompareDetailContent />
    </Suspense>
  );
}
