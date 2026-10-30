/**
 * 홈 '이용자가 자주 찾는 법령'(T42).
 *
 * T43: 이용 집계(GET /api/v1/usage/popular, 최근 30일 법령 조회 — 익명)가 충분하면 그 순위를, 아니면(초기·이용 DB
 * 미설정·실패) 편집 목록(대표 법령)을 돌려준다. 홈은 source 를 보고 제목 옆 안내 문구만 바꾼다.
 */
export type PopularSource = "usage" | "curated";

export interface PopularLaws {
  source: PopularSource;
  laws: { name: string; note?: string }[];
}

// 공개 API 에서 이름을 확인한 대표 법령(2026-10-30)
const CURATED: PopularLaws["laws"] = [
  { name: "조선민주주의인민공화국 헌법", note: "헌법" },
  { name: "형법", note: "형·민사" },
  { name: "형사소송법", note: "형·민사" },
  { name: "민법", note: "형·민사" },
  { name: "가족법", note: "형·민사" },
  { name: "외국인투자법", note: "외교·대외경제" },
  { name: "반동사상문화배격법", note: "교육·문화·체육" },
  { name: "평양문화어보호법", note: "교육·문화·체육" },
];

// 집계를 믿고 쓰기 시작하는 최소 규모(30일 합계·법령 수)
const MIN_TOTAL = 30;
const MIN_LAWS = 3;

const API =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getPopularLaws(): Promise<PopularLaws> {
  try {
    const res = await fetch(`${API}/api/v1/usage/popular?days=30&limit=8`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const d: { total: number; laws: { name: string; count: number }[] } = await res.json();
      if (d.total >= MIN_TOTAL && d.laws.length >= MIN_LAWS) {
        return { source: "usage", laws: d.laws.map((l) => ({ name: l.name, note: `${l.count.toLocaleString()}회` })) };
      }
    } else {
      void res.body?.cancel().catch(() => {});
    }
  } catch {
    // 집계를 못 읽으면 대표 법령으로
  }
  return { source: "curated", laws: CURATED };
}
