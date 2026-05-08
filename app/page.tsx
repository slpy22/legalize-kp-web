import Link from "next/link";
import { fetchCategories } from "@/lib/api";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const ref = await fetchCategories();
  const categories = [...ref.categories].sort((a, b) => b.count - a.count);

  return (
    <>
      {/* 히어로 / 검색 영역 */}
      <section className="bg-navy-light px-4 py-10 text-white sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            북한법률정보센터
          </h1>
          <p className="mb-8 text-white/80">
            북한 법령 {ref.total_laws}건의 조문 검색, 개정이력, 남북법 비교
          </p>
          <SearchBar size="large" />
        </div>
      </section>

      {/* 통계 바 */}
      <section className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-8 text-sm text-gray-600">
          <span>
            총 법령{" "}
            <strong className="text-navy">{ref.total_laws}</strong>건
          </span>
          <span>
            카테고리{" "}
            <strong className="text-navy">{categories.length}</strong>개
          </span>
        </div>
      </section>

      {/* 카테고리 그리드 */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-6 text-xl font-bold text-gray-800">
          분야별 법령 목록
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.category}
              href={`/category/${encodeURIComponent(cat.category)}`}
              className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold text-navy group-hover:underline">
                {cat.category}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {cat.count}건
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
