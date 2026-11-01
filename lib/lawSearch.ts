/**
 * 법령명 찾기·연도 표기(T50) — 서버·브라우저 공용(순수 함수).
 * 자동완성은 법령명·별칭의 부분 일치와 초성(ㅎㅂ → 형법)으로 찾는다. 공백·가운뎃점은 무시한다.
 */

/** /law-index 가 돌려주는 한 줄(짧은 키 — 368종 전체가 한 번에 내려간다) */
export interface LawIndexEntry {
  n: string;          // 정식 법령명
  a: string[];        // 별칭·옛 이름
  c: string;          // 분야
  y: number | null;   // 채택 연도
  v: number | null;   // 최신 판본 연도(개정이 있을 때만, 채택 연도와 같으면 null)
  t?: boolean;        // 본문 미확보(T54)
}

const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

export function normName(s: string): string {
  return (s || "").replace(/[\s·ㆍ・「」]/g, "").toLowerCase();
}

/** 한글 음절을 초성으로(그 밖의 글자는 그대로) — '형법' → 'ㅎㅂ' */
export function choseong(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0) - 0xac00;
    out += code >= 0 && code < 11172 ? CHO[Math.floor(code / 588)] : ch;
  }
  return out;
}

const isChoseongOnly = (q: string) => /^[ㄱ-ㅎ]+$/.test(q);

export interface LawMatch {
  entry: LawIndexEntry;
  via?: string;   // 별칭으로 찾았으면 그 별칭
}

/** 낱말(공백으로 나눈 조각) 첫머리에서 맞는가 — '조선민주주의인민공화국 헌법'은 '헌법'으로 시작하는 낱말이 있다 */
function wordPrefix(name: string, q: string): boolean {
  return name.split(/\s+/).some((w) => normName(w).startsWith(q));
}

/** 점수가 낮을수록 앞: 정확 0 < 앞부분·낱말 첫머리 1 < 포함 2 < 별칭 3~5 < 초성 6~7. 같으면 짧은 이름이 앞
 *  ('헌법' → 조선민주주의인민공화국 헌법(낱말 첫머리)이 문헌법(가운데 포함)보다 앞) */
export function matchLaws(index: LawIndexEntry[], query: string, limit = 8): LawMatch[] {
  const q = normName(query);
  if (!q) return [];
  const cho = isChoseongOnly(q);
  const scored: { m: LawMatch; s: number }[] = [];
  for (const e of index) {
    const n = normName(e.n);
    let s = -1;
    let via: string | undefined;
    if (!cho) {
      if (n === q) s = 0;
      else if (n.startsWith(q) || wordPrefix(e.n, q)) s = 1;
      else if (n.includes(q)) s = 2;
      else {
        for (const a of e.a) {
          const na = normName(a);
          const sa = na === q ? 3 : na.startsWith(q) ? 4 : na.includes(q) ? 5 : -1;
          if (sa >= 0 && (s < 0 || sa < s)) {
            s = sa;
            via = a;
          }
        }
      }
    } else {
      const c = choseong(n);
      s = c.startsWith(q) ? 6 : c.includes(q) ? 7 : -1;
    }
    if (s >= 0) scored.push({ m: { entry: e, via }, s });
  }
  scored.sort((x, y) => x.s - y.s || x.m.entry.n.length - y.m.entry.n.length || x.m.entry.n.localeCompare(y.m.entry.n, "ko"));
  return scored.slice(0, limit).map((x) => x.m);
}

/** 연도 표기 조각 — ["2008 채택", "2024 개정"]. 화면에서 조각마다 줄바꿈하지 않게 감싼다 */
export function lawYearParts(adopted: number | null | undefined, latest: number | null | undefined): string[] {
  const parts: string[] = [];
  if (adopted) parts.push(`${adopted} 채택`);
  if (latest && latest !== adopted) parts.push(`${latest} 개정`);
  return parts;
}

export function yearOf(d: string | null | undefined): number | null {
  const y = d ? parseInt(String(d).slice(0, 4), 10) : NaN;
  return Number.isFinite(y) && y > 1900 ? y : null;
}
