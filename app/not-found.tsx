import Link from "next/link";

/** T77: 없는 주소의 공통 안내(HTTP 404). 법령 주소는 app/law/[name]/not-found.tsx 가 따로 안내한다. */
export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-3 text-2xl font-bold text-navy">페이지를 찾을 수 없습니다</h1>
      <p className="mb-6 text-sm text-gray-600">주소가 바뀌었거나 없는 페이지입니다. 검색이나 법령 색인에서 찾아 보세요.</p>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/search" className="rounded-lg bg-navy px-4 py-2 font-semibold text-white hover:bg-navy-light">검색</Link>
        <Link href="/law-index" className="rounded-lg border border-navy-light px-4 py-2 font-medium text-navy-light hover:bg-navy-light hover:text-white">법령 색인</Link>
        <Link href="/" className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100">홈</Link>
      </div>
    </section>
  );
}
