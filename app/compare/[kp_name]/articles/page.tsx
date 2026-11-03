"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { fetchCompareArticles, fetchCompareDetail } from "@/lib/api";
import AutoNotice, { lawGoKrUrl } from "@/components/compare/AutoNotice";

// T57: 짝은 매핑 자료의 조문 대응대로(같은 번호끼리 짝짓지 않음), 남한 법은 이름이 정확히 같은 현행 법령만
interface ArticlePair {
  article?: string;        // "제7조 ↔ 제2조"
  kp_article?: string;
  kr_article?: string;
  topic?: string | null;
  kp?: { number?: string; title?: string; content?: string } | null;
  kr?: { number?: string; title?: string; content?: string } | null;
  status?: "ok" | "kr_article_not_found" | "kr_article_deleted" | "kr_law_not_found" | "kr_law_unavailable";
  kp_fallback?: { version_date: string; notice: string } | null;   // T66: 북한 조문을 직전 전문 판본에서 가져옴
}

const PAIR_STATUS: Record<string, string> = {
  kr_article_not_found: "현행 남한법에 이 조문이 없습니다(번호가 바뀌었거나 잘못 적힌 대응).",
  kr_article_deleted: "이 남한 조문은 삭제되었습니다.",
  kr_law_not_found: "같은 이름의 현행 남한 법령이 없습니다.",
  kr_law_unavailable: "남한 법령을 지금 불러올 수 없습니다.",
};

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
  const [krStatus, setKrStatus] = useState<string>("found");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        let resolvedKr = krNameParam || "";
        // If no kr_name in query, fetch from detail
        if (!resolvedKr) {
          const detail = await fetchCompareDetail(kpName);
          resolvedKr = detail?.kr_names?.[0] || detail?.kr_name || "";  // T57: N:M 스키마는 kr_names
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
        setKrStatus(data.kr_status || "found");
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
        <Link prefetch={false} href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <Link prefetch={false} href="/compare" className="hover:text-navy-light">남북비교</Link>
        <span className="mx-2">/</span>
        <Link prefetch={false} href={`/compare/${encodeURIComponent(kpName)}`} className="hover:text-navy-light">{kpName}</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">조문 비교</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-800">조문 비교</h1>
      <p className="mb-4 text-sm text-gray-500">
        북한 {kpName} {krName ? <>↔ 남한 <a href={lawGoKrUrl(krName)} target="_blank" rel="noopener noreferrer" className="hover:underline">{krName}</a></> : ""}
      </p>
      <AutoNotice className="mb-3" />
      <p className="mb-6 text-xs text-gray-500">
        매핑 자료에 적힌 조문 대응만 나란히 보여 줍니다. 조 번호가 같다고 짝짓지 않습니다.
      </p>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {!loading && !error && krStatus === "not_found" && (
        <p className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <strong>대응 없음</strong> — 「{krName}」과 이름이 같은 현행 남한 법령이 없습니다(폐지·개명됐거나 매핑의 법령명이 틀렸을 수 있습니다).
        </p>
      )}
      {!loading && !error && krStatus === "unavailable" && (
        <p className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">남한 법령을 지금 불러올 수 없습니다. 잠시 뒤 다시 시도해 주세요.</p>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      ) : pairs.length === 0 && kpUnmatched.length === 0 && krUnmatched.length === 0 ? (
        <div className="py-20 text-center text-gray-400">조문 비교 데이터가 없습니다.</div>
      ) : (
        <>
          {pairs.length === 0 && krStatus === "found" && (
            <p className="mb-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              이 남한 법령과의 조문 대응은 아직 정리되지 않았습니다. 아래에서 두 법의 조문을 따로 볼 수 있습니다.
            </p>
          )}
        </>
      )}
      {!loading && (pairs.length > 0 || kpUnmatched.length > 0 || krUnmatched.length > 0) && (
        <>
          {/* 매칭된 조문 */}
          {pairs.length > 0 && (
            <div className="mb-8 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
              <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-700">
                매핑 자료의 조문 대응 ({pairs.length}쌍)
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-navy-light text-white">
                    <th className="w-[12%] px-4 py-3 text-center font-semibold">대응</th>
                    <th className="w-[45%] px-4 py-3 text-left font-semibold">북한</th>
                    <th className="w-[45%] px-4 py-3 text-left font-semibold">남한</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((pair, i) => (
                    <tr key={i} className="border-b border-gray-100 align-top transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        <span className="font-mono">{pair.kp_article || "-"}</span>
                        <span className="block text-gray-300">↔</span>
                        <span className="font-mono">{pair.kr_article || "-"}</span>
                        {pair.topic && <span className="mt-1 block text-[11px] text-gray-400">{pair.topic}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {pair.kp_fallback && (
                          <p className="mb-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">{pair.kp_fallback.notice}</p>
                        )}
                        {pair.kp?.title && (
                          <p className="mb-1 text-xs font-semibold text-navy">{pair.kp.title}</p>
                        )}
                        <p className="whitespace-pre-wrap text-gray-600">{pair.kp?.content || "-"}</p>
                      </td>
                      <td className="px-4 py-3">
                        {pair.kr?.title && (
                          <p className="mb-1 text-xs font-semibold text-red-700">{pair.kr.title}</p>
                        )}
                        {pair.status && pair.status !== "ok" && (
                          <p className="mb-1 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{PAIR_STATUS[pair.status] || pair.status}</p>
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
            <details className="mb-8 overflow-x-auto rounded-lg border border-blue-200 bg-white shadow-sm">
              <summary className="cursor-pointer border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
                대응이 정리되지 않은 북한 조문 ({kpUnmatched.length}개)
              </summary>
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
            </details>
          )}

          {/* 남한법에만 있는 조문 */}
          {krUnmatched.length > 0 && (
            <details className="mb-8 overflow-x-auto rounded-lg border border-red-200 bg-white shadow-sm">
              <summary className="cursor-pointer border-b border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                대응이 정리되지 않은 남한 조문 ({krUnmatched.length}개)
              </summary>
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
            </details>
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
