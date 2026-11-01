import { fetchLawList } from "@/lib/api";
import { yearOf, type LawIndexEntry } from "@/lib/lawSearch";
import type { LawSummary } from "@/lib/types";

/**
 * 법령 색인(T50) — 자동완성·연도 표기용. 서버에서 법령 목록(action=list, 내부 호출)으로 만들어 6시간 담아 둔다.
 * 브라우저는 같은 출처의 /law-index 로 받는다(바깥 API 는 한 번에 50건까지라 목록 전체를 직접 받을 수 없다, T47).
 */
const TTL_MS = 6 * 60 * 60 * 1000;
let cached: { at: number; value: LawIndexEntry[] } | null = null;
let inflight: Promise<LawIndexEntry[]> | null = null;

function aliasesOf(raw: LawSummary["name_alias"]): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(list.map((x) => String(x).trim()).filter(Boolean))];
}

export function toIndexEntry(l: LawSummary): LawIndexEntry {
  const y = yearOf(l.enactment_date);
  const v = l.amendment_count > 0 ? yearOf(l.latest_version_date) : null;
  // T54: aliases(별칭·약칭·옛 이름) 우선, 본문 미확보면 t
  const e: LawIndexEntry = { n: l.name, a: l.aliases ?? aliasesOf(l.name_alias), c: l.category, y, v: v && v !== y ? v : null };
  if (l.text_unavailable) e.t = true;
  return e;
}

export async function getLawIndex(): Promise<LawIndexEntry[]> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  inflight ??= fetchLawList()
    .then(({ laws }) => {
      const value = laws.map(toIndexEntry);
      cached = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** 이름 → 색인 한 줄(서버 화면의 목록에 연도를 붙일 때) */
export async function getLawIndexMap(): Promise<Map<string, LawIndexEntry>> {
  try {
    return new Map((await getLawIndex()).map((e) => [e.n, e]));
  } catch {
    return new Map();
  }
}
