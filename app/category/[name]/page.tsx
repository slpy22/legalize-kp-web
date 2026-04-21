import Link from "next/link";
import { fetchCategories, fetchLawsByCategory } from "@/lib/api";
import CategoryLawList from "./CategoryLawList";

export async function generateStaticParams() {
  const ref = await fetchCategories();
  return ref.categories.map((c) => ({ name: c.category }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const category = decodeURIComponent(name);
  const data = await fetchLawsByCategory(category);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">{category}</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-800">{category}</h1>
      <p className="mb-6 text-sm text-gray-500">총 {data.laws.length}건</p>

      <CategoryLawList laws={data.laws} />
    </section>
  );
}
