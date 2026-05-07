import Link from "next/link";
import { fetchCategories } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const ref = await fetchCategories();
  const sorted = [...ref.categories].sort((a, b) => b.count - a.count);
  const maxCount = sorted.length > 0 ? sorted[0].count : 1;

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">통계</span>
      </nav>

      <h1 className="mb-8 text-2xl font-bold text-gray-800">법령 통계</h1>

      {/* 중앙 큰 숫자 */}
      <div className="mb-10 text-center">
        <p className="text-6xl font-bold text-navy">{ref.total_laws}</p>
        <p className="mt-2 text-gray-500">총 법령 수</p>
      </div>

      {/* 가로 바 차트 */}
      <h2 className="mb-4 text-lg font-bold text-gray-700">
        카테고리별 법령 수
      </h2>
      <div className="space-y-3">
        {sorted.map((cat) => {
          const pct = Math.round((cat.count / maxCount) * 100);
          return (
            <div key={cat.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <Link
                  href={`/category/${encodeURIComponent(cat.category)}`}
                  className="font-medium text-gray-700 hover:text-navy-light"
                >
                  {cat.category}
                </Link>
                <span className="text-gray-500">{cat.count}건</span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-navy-light transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
