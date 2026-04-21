import Link from "next/link";
import type { LawSummary } from "@/lib/types";

interface Props {
  law: LawSummary;
}

export default function LawCard({ law }: Props) {
  return (
    <Link
      href={`/law/${encodeURIComponent(law.name)}`}
      className="group block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-navy-light hover:shadow-md"
    >
      <h3 className="font-semibold text-navy-light group-hover:underline">
        {law.name}
      </h3>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {law.enactment_date && <span>채택일: {law.enactment_date}</span>}
        {law.latest_version_date && <span>최신: {law.latest_version_date}</span>}
        {law.total_articles != null && <span>조문수: {law.total_articles}</span>}
      </div>
    </Link>
  );
}
