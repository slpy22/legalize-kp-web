/**
 * T77: 없는 판본·없는 법령 주소 안내용 순수 함수.
 *
 * - API 는 없는 법령·없는 판본 일자에 HTTP 200 과 `data.error` 를 돌려준다(본문 대신 안내).
 *   화면은 이것을 본문으로 읽지 말고 404 안내 화면으로 돌린다(isApiError).
 * - 안내 화면(not-found)은 props 를 받지 못하고, Next 가 정상 화면에서도 미리 그려 둔다(RSC 에 실림).
 *   그래서 서버에서 판본을 불러오지 않고, 브라우저에서 실제로 보일 때만 불러온다(LawMissNotice).
 */

export interface ApiErrorData {
  error: string;
  available?: unknown;
  law_name?: string;
}

export function isApiError(d: unknown): d is ApiErrorData {
  return typeof d === "object" && d !== null && typeof (d as { error?: unknown }).error === "string";
}

/** 'YYYY' · 'YYYY-MM' · 'YYYY-MM-DD'(구분자 - . /) → 그 기간 첫날의 UTC 일 수. 날짜가 아니면 null. */
export function dayNumber(s: string): number | null {
  const m = /^\s*(\d{4})(?:[-./](\d{1,2})(?:[-./](\d{1,2}))?)?\s*$/.exec(s || "");
  if (!m) return null;
  const y = Number(m[1]);
  const mo = m[2] ? Number(m[2]) : 1;
  const d = m[3] ? Number(m[3]) : 1;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, mo - 1, d);
  // 2월 30일처럼 넘친 날짜는 거른다
  if (new Date(t).getUTCMonth() !== mo - 1) return null;
  return Math.round(t / 86400000);
}

/**
 * 요청 일자에 가장 가까운 판본(nearest)과 그 일자에 시행 중이던 판본 = 그 일자 이전 마지막 판본(before).
 * 거리가 같으면 앞 판본. 요청이 날짜가 아니면 둘 다 null.
 */
export function nearestVersion(requested: string, dates: string[]): { nearest: string | null; before: string | null } {
  const r = dayNumber(requested);
  if (r === null) return { nearest: null, before: null };
  const ds = dates
    .map((d) => ({ d, n: dayNumber(d) }))
    .filter((x): x is { d: string; n: number } => x.n !== null)
    .sort((a, b) => a.n - b.n);
  let nearest: { d: string; n: number } | null = null;
  let before: string | null = null;
  for (const x of ds) {
    if (!nearest || Math.abs(x.n - r) < Math.abs(nearest.n - r)) nearest = x;
    if (x.n <= r) before = x.d;
  }
  return { nearest: nearest?.d ?? null, before };
}

/** 주소의 법령 이름 조각 → 이름(깨진 인코딩이면 그대로). */
export function decodeName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
