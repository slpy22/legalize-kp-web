import Link from "next/link";
import type { LawSummary } from "@/lib/types";
import LawYears from "@/components/LawYears";
import { yearOf } from "@/lib/lawSearch";

interface Props {
  law: LawSummary;
}

export default function LawCard({ law }: Props) {
  return (
    <Link
      prefetch={false}
      href={`/law/${encodeURIComponent(law.name)}`}
      className="group block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-navy-light hover:shadow-md"
    >
      <h3 className="font-semibold text-navy-light group-hover:underline">
        {law.name}
        {law.text_unavailable && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-xs font-normal text-amber-800">본문 미확보</span>}
      </h3>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {/* T50 ⑥: 목록마다 같은 연도 표기 */}
        <LawYears
          adopted={yearOf(law.enactment_date)}
          latest={law.amendment_count > 0 ? yearOf(law.latest_version_date) : null}
          className="font-medium text-gray-600"
        />
        {law.text_unavailable ? <span>조문 없음(근거·이력만)</span> : law.total_articles != null && <span>조문수: {law.total_articles}</span>}
      </div>
    </Link>
  );
}
