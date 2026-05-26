"use client";

/**
 * 조문 번호가 없는 버전(예: 2016년 조선로동당규약 — 서술형 원문)의 전문 표시.
 * markdown frontmatter 를 제거하고 본문을 통짜 텍스트로 보존 렌더한다.
 */
function stripFrontmatter(md: string): string {
  const t = md ?? "";
  if (t.startsWith("---")) {
    const parts = t.split("---");
    if (parts.length >= 3) return parts.slice(2).join("---").trim();
  }
  return t.trim();
}

export default function VersionFullText({ text }: { text: string }) {
  const body = stripFrontmatter(text);
  if (!body) {
    return (
      <p className="py-8 text-center text-gray-400">이 버전의 본문이 없습니다.</p>
    );
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-5">
      <p className="mb-3 text-xs text-amber-700">
        * 이 버전은 원문이 조문 번호 없는 서술형이라 조문 단위로 나눌 수 없어 전문으로 표시합니다.
      </p>
      <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
        {body}
      </div>
    </div>
  );
}
