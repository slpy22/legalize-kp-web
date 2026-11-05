import Link from "next/link";
import type { RefData } from "@/lib/types";

/**
 * 분야별 법령 목록(분야 이름·법령 수 → /category/…). 검색어 없는 /search(T42)와 /law 법령 목록(T120)이 같이 쓴다.
 * 데이터는 부르는 쪽이 받는다 — /search 는 브라우저에서, /law 는 서버에서(공유 미리보기·검색 로봇도 목록을 본다).
 */
export default function CategoryGrid({
  data,
  failed = false,
  heading = "분야별 법령",
}: {
  data: RefData | null;
  failed?: boolean;
  heading?: string;
}) {
  const categories = data ? [...data.categories].sort((a, b) => b.count - a.count) : [];
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-gray-800">
        {heading}
        {data ? <span className="ml-2 text-sm font-normal text-gray-500">총 {data.total_laws}건</span> : null}
      </h2>
      {failed && <p className="text-sm text-gray-500">분야 목록을 불러올 수 없습니다.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            prefetch={false}
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
  );
}
