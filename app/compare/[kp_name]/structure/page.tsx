"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { fetchCompareStructure, fetchCompareDetail } from "@/lib/api";

interface ChapterItem {
  chapter: string;
  article_count?: number;
}

interface StructureData {
  kp_chapters: ChapterItem[];
  kr_chapters: ChapterItem[];
  kp_name: string;
  kr_name: string;
}

function StructureContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const kpName = decodeURIComponent(params.kp_name as string);
  const krNameParam = searchParams.get("kr_name");

  const [data, setData] = useState<StructureData | null>(null);
  const [krName, setKrName] = useState(krNameParam || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        let resolvedKr = krNameParam || "";
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

        const result = await fetchCompareStructure(kpName, resolvedKr);
        setData(result);
      } catch {
        setError("체계 비교 데이터를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [kpName, krNameParam]);

  const kpChapters = data?.kp_chapters || [];
  const krChapters = data?.kr_chapters || [];
  const maxLen = Math.max(kpChapters.length, krChapters.length);

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
        <span className="font-medium text-gray-800">체계 비교</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-800">체계 비교</h1>
      <p className="mb-6 text-sm text-gray-500">
        {kpName} {krName ? `↔ ${krName}` : ""}
      </p>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      ) : maxLen === 0 ? (
        <div className="py-20 text-center text-gray-400">체계 비교 데이터가 없습니다.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 북한법 체계 */}
          <div className="rounded-lg border-2 border-navy-light bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-navy">북한: {kpName}</h2>
            {kpChapters.length === 0 ? (
              <p className="text-sm text-gray-400">장 구조 없음</p>
            ) : (
              <ul className="space-y-2">
                {kpChapters.map((ch, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-800">{ch.chapter}</span>
                    {ch.article_count != null && (
                      <span className="text-xs text-gray-400">{ch.article_count}조</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 남한법 체계 */}
          <div className="rounded-lg border-2 border-accent bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-red-700">남한: {krName}</h2>
            {krChapters.length === 0 ? (
              <p className="text-sm text-gray-400">장 구조 없음</p>
            ) : (
              <ul className="space-y-2">
                {krChapters.map((ch, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-800">{ch.chapter}</span>
                    {ch.article_count != null && (
                      <span className="text-xs text-gray-400">{ch.article_count}조</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function StructurePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <StructureContent />
    </Suspense>
  );
}
