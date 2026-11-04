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

/** T97: 이름 해석 응답 → 404 안내에 보일 후보(최대 3개). 확실한 1개는 strong, 나머지는 others. 후보 없으면 둘 다 비움. */
export interface NameSuggestion {
  name: string;
  matched_by: string;
  reason?: string | null;
}

export function pickSuggestions(
  data: {
    resolved?: string | null;
    matched_by?: string | null;
    candidates?: { name: string; matched_by: string; confident?: boolean; reason?: string | null }[];
  } | null | undefined,
  asked: string,
): { strong: NameSuggestion | null; others: NameSuggestion[] } {
  if (!data || isApiError(data)) return { strong: null, others: [] };
  const all: { name: string; matched_by: string; confident: boolean; reason: string | null }[] = [];
  if (data.resolved) all.push({ name: data.resolved, matched_by: data.matched_by || "resolved", confident: true, reason: null });
  for (const c of data.candidates || []) {
    if (c && c.name && c.name !== asked && !all.some((a) => a.name === c.name)) {
      all.push({ name: c.name, matched_by: c.matched_by, confident: !!c.confident, reason: c.reason ?? null });
    }
  }
  const top = all.slice(0, 3);
  const strongIdx = top.findIndex((c) => c.confident);
  const pick = (c: (typeof all)[number]): NameSuggestion =>
    c.reason ? { name: c.name, matched_by: c.matched_by, reason: c.reason } : { name: c.name, matched_by: c.matched_by };
  const strong = strongIdx >= 0 ? pick(top[strongIdx]) : null;
  const others = top.filter((_, i) => i !== strongIdx).map(pick);
  return { strong, others };
}

/** T98: 이유를 화면에 적는 후보 — 옛이름(①)·남한 대응(②)·관련(③). 오타·두음 등 이름이 비슷한 것은 이유 없이. */
const REASON_SHOWN = new Set(["former_name", "kr_mapping", "semantic"]);

export function shownReason(s: NameSuggestion): string | null {
  return REASON_SHOWN.has(s.matched_by) && s.reason ? s.reason : null;
}

/** T98: 나머지 후보의 이유가 모두 같으면 그 이유(앞말에 한 번만 적고 항목마다 되풀이하지 않는다), 아니면 null */
export function sharedReason(others: NameSuggestion[]): string | null {
  const rs = others.map(shownReason);
  return rs.length > 0 && rs[0] && rs.every((r) => r === rs[0]) ? rs[0] : null;
}

/** T98: 나머지 후보 목록의 앞말. 이유가 모두 같으면 그 이유로('관련 있을 수 있는 법령', '남한 「…」에 대응하는 법령'). */
export function othersLead(strong: NameSuggestion | null, others: NameSuggestion[]): string {
  if (strong) return "다른 비슷한 이름: ";
  const shared = sharedReason(others);
  if (shared && others[0].matched_by === "semantic") return "이름이 같은 법령은 없습니다. 관련 있을 수 있는 법령: ";
  if (shared && others[0].matched_by === "kr_mapping") return `이름이 같은 북한 법령은 없습니다. ${shared.replace(/에 대응$/, "에 대응하는")} 법령: `;
  return "혹시 이 법령을 찾으셨나요? ";
}

/** 목적격 조사: 받침 있으면 '을', 없으면 '를'(한글이 아니면 '을(를)'). 「조선민주주의인민공화국 헌법」을 */
export function objectParticle(word: string): string {
  const last = (word || "").trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (!(code >= 0 && code < 11172)) return "을(를)";
  return code % 28 ? "을" : "를";
}

/** 주소의 법령 이름 조각 → 이름(깨진 인코딩이면 그대로). */
export function decodeName(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
