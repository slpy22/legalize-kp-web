import type { Provenance } from "@/lib/types";

interface Props {
  p?: Provenance | null;
  size?: "xs" | "sm";
  className?: string;
  /** false 면 출처 표기를 링크로 만들지 않는다(카드 전체가 <Link> 인 곳 — a 중첩 방지) */
  linkSource?: boolean;
}

/**
 * 출처 표시 배지 (T7, T26).
 * - 출처 라벨(국정원 법령집 / 법무부 통일법제DB / 통일부 발표 / NK TechLab / 데일리NK 재입력본)은 회색 칩
 * - OCR 본문(OCR여부 true)은 '미검증 OCR' 경고 칩(호박색)
 * - '비정본'은 출처 자체가 비공식 재입력본(출처 설정 unofficial)일 때만 API 가 붙인다(T26, 장미색).
 *   정본여부(국정원 법령집 수록 여부)로는 붙이지 않는다.
 * - credit(이용허락 출처 표기)이 있으면 '출처: 데일리NK' 를 덧붙이고, source_url 이 있으면 기사로 링크한다.
 * 마우스를 올리면 출처 설명(source_desc.desc)·출처비고·판본비고가 뜬다.
 */
export default function ProvenanceBadges({ p, size = "sm", className = "", linkSource = true }: Props) {
  if (!p || !p.labels || p.labels.length === 0) return null;
  const pad = size === "xs" ? "px-1.5 py-0 text-[11px]" : "px-2 py-0.5 text-xs";
  const title =
    [p.source_desc?.desc, p.source_note, p.version_note].filter(Boolean).join("\n") || undefined;
  const textSize = size === "xs" ? "text-[11px]" : "text-xs";
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 align-middle ${className}`}>
      {p.labels.map((label) =>
        label === "미검증 OCR" ? (
          <span
            key={label}
            title={title}
            className={`rounded-full border border-amber-300 bg-amber-50 font-medium text-amber-800 ${pad}`}
          >
            ⚠ {label}
          </span>
        ) : label === "발췌본" ? (
          <span
            key={label}
            title="전문이 아닌 발췌 판본입니다"
            className={`rounded-full border border-sky-200 bg-sky-50 font-medium text-sky-700 ${pad}`}
          >
            {label}
          </span>
        ) : label === "비정본" && p.unofficial ? (
          <span
            key={label}
            title="북한 공식 발간본이 아닌 재입력 텍스트입니다. 인용 전 원문 대조가 필요합니다."
            className={`rounded-full border border-rose-200 bg-rose-50 font-medium text-rose-700 ${pad}`}
          >
            {label}
          </span>
        ) : (
          <span
            key={label}
            title={title}
            className={`rounded-full border border-gray-200 bg-gray-50 font-medium text-gray-600 ${pad}`}
          >
            {label}
          </span>
        ),
      )}
      {p.credit &&
        (p.source_url && linkSource ? (
          <a
            href={p.source_url}
            target="_blank"
            rel="noopener noreferrer"
            title={title}
            className={`text-gray-500 underline decoration-dotted hover:text-gray-700 ${textSize}`}
          >
            출처: {p.credit}
          </a>
        ) : (
          <span title={title} className={`text-gray-500 ${textSize}`}>
            출처: {p.credit}
          </span>
        ))}
    </span>
  );
}
