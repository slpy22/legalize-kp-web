import Link from "next/link";
import { fetchHistory } from "@/lib/api";
import AmendmentTimeline from "@/components/AmendmentTimeline";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const history = await fetchHistory(name);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/law/${encodeURIComponent(name)}`}
          className="hover:text-navy-light"
        >
          {name}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">개정이력</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-800">개정이력</h1>
      <p className="mb-8 text-sm text-gray-500">
        {history.law_name} &mdash; 총 {history.amendments.length}건
      </p>

      <AmendmentTimeline amendments={history.amendments} />
    </section>
  );
}
