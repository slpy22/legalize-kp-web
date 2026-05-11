"use client";

import { useRouter } from "next/navigation";
import type { LawVersionMeta } from "@/lib/types";

interface Props {
  lawName: string;
  versions: LawVersionMeta[];
  /** 현재 선택된 버전 일자 (null = 현행본) */
  current: string | null;
  /** 현행본의 일자 (메타 카드에 표시되는 값) — 참고용 */
  currentDate?: string | null;
}

/** 법령 페이지의 버전 셀렉터 (드롭다운). 선택 시 ?version= 쿼리 변경. */
export default function VersionSelector({
  lawName,
  versions,
  current,
  currentDate,
}: Props) {
  const router = useRouter();

  if (!versions || versions.length === 0) return null;

  function onChange(value: string) {
    const path = `/law/${encodeURIComponent(lawName)}`;
    if (!value) {
      router.push(path);
    } else {
      router.push(`${path}?version=${value}`);
    }
  }

  // 현행본을 가장 위에 놓고, 그 뒤에 적재된 버전들을 최신 순으로
  const sorted = [...versions].sort((a, b) =>
    (b.version_date || "").localeCompare(a.version_date || "")
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="text-gray-600">시점:</label>
      <select
        value={current ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-800 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
      >
        <option value="">
          현행본{currentDate ? ` (${currentDate})` : ""}
        </option>
        {sorted.map((v) => (
          <option key={v.id} value={v.version_date}>
            {v.version_date}
            {v.action ? ` (${v.action})` : ""}
            {v.source ? ` [${v.source}]` : ""}
          </option>
        ))}
      </select>
      {current && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100"
          title="현행본으로 돌아가기"
        >
          현행본 보기
        </button>
      )}
    </div>
  );
}
