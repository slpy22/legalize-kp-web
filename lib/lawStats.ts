import { fetchHistory, fetchLawList } from "@/lib/api";
import type { LawSummary } from "@/lib/types";

/**
 * 연도별 제정·개정·폐지·판본 건수(T42 통계 페이지).
 *
 * 기존 API 만으로 만든다 — 법령 목록(action=list)의 제정일 + 법령별 개정 이력(action=history)의
 * 일자·종류·본문 보유(has_text). 이력은 법령마다 한 번씩(333회) 불러야 해서, 서버 메모리에 6시간 담아 두고
 * 같은 시각에 들어온 요청은 진행 중인 계산을 같이 기다린다. 실패한 계산은 담지 않는다.
 */
export interface YearRow {
  year: number;
  enacted: number;   // 제정(채택) — 목록의 enactment_date 연도
  amended: number;   // 개정(수정·수정보충 등, 채택·폐지 제외) — 원문 미확보 개정 포함
  repealed: number;  // 폐지
  versions: number;  // 본문을 보유한 판본(has_text)
}

export interface LawStats {
  rows: YearRow[];
  totals: { laws: number; enacted: number; amended: number; repealed: number; versions: number };
  historyFailed: number; // 이력을 못 불러온 법령 수(0 이 아니면 개정·판본이 그만큼 덜 셈)
  generatedAt: string;
}

const TTL_MS = 6 * 60 * 60 * 1000;
const CONCURRENCY = 6;
let cached: { at: number; value: LawStats } | null = null;
let inflight: Promise<LawStats> | null = null;

function yearOf(d: string | null | undefined): number | null {
  const y = d ? parseInt(d.slice(0, 4), 10) : NaN;
  return Number.isFinite(y) && y > 1900 ? y : null;
}

async function compute(): Promise<LawStats> {
  const { laws } = await fetchLawList();
  const byYear = new Map<number, YearRow>();
  const row = (y: number) => {
    let r = byYear.get(y);
    if (!r) byYear.set(y, (r = { year: y, enacted: 0, amended: 0, repealed: 0, versions: 0 }));
    return r;
  };
  for (const law of laws) {
    const y = yearOf(law.enactment_date);
    if (y) row(y).enacted++;
  }
  let historyFailed = 0;
  const queue: LawSummary[] = [...laws];
  async function worker() {
    for (let law = queue.shift(); law; law = queue.shift()) {
      try {
        const h = await fetchHistory(law.name);
        for (const a of h.amendments || []) {
          const y = yearOf(a.date);
          if (!y) continue;
          const act = a.action || "";
          if (act.includes("폐지")) row(y).repealed++;
          else if (!act.includes("채택") && !act.includes("제정")) row(y).amended++;
          if (a.has_text) row(y).versions++;
        }
      } catch {
        historyFailed++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const rows = [...byYear.values()].sort((a, b) => a.year - b.year);
  const sum = (k: keyof Omit<YearRow, "year">) => rows.reduce((n, r) => n + r[k], 0);
  return {
    rows,
    totals: { laws: laws.length, enacted: sum("enacted"), amended: sum("amended"), repealed: sum("repealed"), versions: sum("versions") },
    historyFailed,
    generatedAt: new Date().toISOString(),
  };
}

export async function getLawStats(): Promise<LawStats> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  if (!inflight) {
    inflight = compute()
      .then((value) => {
        // 이력이 대부분 실패했으면 담지 않고 다음 요청에서 다시 센다
        if (value.historyFailed < value.totals.laws / 2) cached = { at: Date.now(), value };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** 판본 날짜 기준 최근 개정(T42 홈) — 개정 이력이 있는 법령을 최신 판본일 순으로 */
export function recentAmendments(laws: LawSummary[], n: number): LawSummary[] {
  return laws
    .filter((l) => l.latest_version_date && l.amendment_count > 0 && l.latest_version_date !== l.enactment_date)
    .sort((a, b) => (b.latest_version_date || "").localeCompare(a.latest_version_date || ""))
    .slice(0, n);
}
