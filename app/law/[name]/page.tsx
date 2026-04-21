import Link from "next/link";
import { fetchAllLawNames, fetchLaw } from "@/lib/api";
import ArticleView from "@/components/ArticleView";

export async function generateStaticParams() {
  const names = await fetchAllLawNames();
  return names.map((n) => ({ name: n }));
}

export default async function LawPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const data = await fetchLaw(name);
  const law = data.law;
  const articles = data.articles;

  /* 장 목록 추출 (순서 유지, 중복 제거) */
  const chapters: string[] = [];
  for (const art of articles) {
    if (art.chapter && !chapters.includes(art.chapter)) {
      chapters.push(art.chapter);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/category/${encodeURIComponent(law.category)}`}
          className="hover:text-navy-light"
        >
          {law.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">{law.name}</span>
      </nav>

      {/* 메타데이터 카드 */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-navy">{law.name}</h1>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-gray-500">카테고리</dt>
            <dd className="font-medium">{law.category}</dd>
          </div>
          <div>
            <dt className="text-gray-500">채택일</dt>
            <dd className="font-medium">{law.enactment_date ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">최신버전</dt>
            <dd className="font-medium">{law.latest_version_date ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">조문수</dt>
            <dd className="font-medium">{law.total_articles ?? 0}조</dd>
          </div>
          <div>
            <dt className="text-gray-500">장수</dt>
            <dd className="font-medium">{law.chapter_count}장</dd>
          </div>
          <div>
            <dt className="text-gray-500">출처</dt>
            <dd className="font-medium">{law.source}</dd>
          </div>
        </dl>
      </div>

      {/* 액션 버튼 */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href={`/law/${encodeURIComponent(law.name)}/history`}
          className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
        >
          개정이력
        </Link>
        <Link
          href={`/diff?name=${encodeURIComponent(law.name)}`}
          className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
        >
          신구대조
        </Link>
        <Link
          href={`/compare?kp=${encodeURIComponent(law.name)}`}
          className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
        >
          남북법비교
        </Link>
      </div>

      {/* 본문 + 목차 사이드바 */}
      <div className="flex gap-8">
        {/* 본문 */}
        <div className="min-w-0 flex-1">
          <ArticleView articles={articles} />
        </div>

        {/* 목차 사이드바 */}
        {chapters.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-4">
              <h4 className="mb-3 text-sm font-bold text-gray-700">목차</h4>
              <ul className="space-y-1 text-sm">
                {chapters.map((ch) => (
                  <li key={ch}>
                    <a
                      href={`#chapter-${ch}`}
                      className="block rounded px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-navy-light"
                    >
                      {ch}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
