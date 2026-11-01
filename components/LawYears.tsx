import { lawYearParts } from "@/lib/lawSearch";

/**
 * 법령 연도 표기(T50) — "2008 채택 · 2024 개정". 조각마다 줄바꿈하지 않아 모바일에서 '2024 / 개정'처럼 끊기지 않는다.
 */
export default function LawYears({
  adopted,
  latest,
  className = "",
}: {
  adopted: number | null | undefined;
  latest: number | null | undefined;
  className?: string;
}) {
  const parts = lawYearParts(adopted, latest);
  if (parts.length === 0) return null;
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1 tabular-nums ${className}`}>
      {parts.map((p, i) => (
        <span key={p} className="whitespace-nowrap">
          {i > 0 && <span aria-hidden className="mr-1 text-gray-300">·</span>}
          {p}
        </span>
      ))}
    </span>
  );
}
