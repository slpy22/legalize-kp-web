/**
 * T101: 방문 분석 화면의 질의 문자열과 표시 이름 — 순수 함수(`npm test` 가 직접 부른다).
 * 거르기 값은 정해진 이름만 보낸다(빈 값은 뺀다). 검색어는 어디에도 없다.
 */
export interface AnalysisFilter { verdict?: string; country?: string; src?: string; org_kind?: string; law?: string }

const FILTER_KEYS = ["verdict", "country", "src", "org_kind", "law"] as const;

/** 방문 분석 목록 질의 — from·to(YYYY-MM-DD) + 고른 거르기만. */
export function analysisQuery(from: string, to: string, f: AnalysisFilter = {}): string {
  const p = new URLSearchParams({ from, to });
  for (const k of FILTER_KEYS) {
    const v = f[k];
    if (v) p.set(k, v);
  }
  return p.toString();
}

/** 집계 질의(목록과 같은 기간 — 주 단위면 from 이 든 주의 월요일부터). */
export function aggsQuery(period: "day" | "week", from: string, to: string, dim?: string): string {
  const p = new URLSearchParams({ period, from: period === "week" ? weekStart(from) : from, to });
  if (dim) p.set("dim", dim);
  return p.toString();
}

/** YYYY-MM-DD 가 든 주의 월요일. */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86400000).toISOString().slice(0, 10);
}

/** KST 오늘에서 n 일 앞(0 = 오늘). */
export function kstDay(back = 0, now = Date.now()): string {
  return new Date(now + 9 * 3600 * 1000 - back * 86400000).toISOString().slice(0, 10);
}

export const VERDICT: Record<string, string> = { human: "사람", bot: "봇", hold: "보류" };
export const ORG_KIND: Record<string, string> = {
  isp: "통신사(가정·모바일)", univ: "대학·교육", research: "연구기관", gov: "정부·공공", cloud: "데이터센터(클라우드·호스팅)", other: "기업·기타",
};
export const BOT_KIND: Record<string, string> = {
  crawler: "검색 수집기", renderer: "렌더러(수집기 뒤따름)", app_preview: "앱 미리보기·웹뷰", ai_agent: "AI 에이전트",
  datacenter: "데이터센터 단발", scanner: "스캔·도구", other: "그 밖의 봇",
};
export const RULE: Record<string, string> = {
  ua: "UA 표지", rdns: "역DNS 확인", impostor: "사칭(역DNS 불일치)", "3b": "렌더러 뒤따름", "3c": "같은 경로 뒤따름",
  "3d": "위조 UA(데이터센터)", "3e": "앱 웹뷰·미리보기", "3f": "데이터센터 단발(정산)", "3g": "자동 열람(정산)", dc: "데이터센터 대역",
  single_short: "단발·짧음", repeat: "같은 묶음 반복", cleanup: "정리 SQL 로 뺌", manual: "수동 판정",
  home_line: "가정·이동통신 회선", dwell: "머문 시간 측정", multi_page: "여러 페이지", external_ref: "바깥 유입", revisit: "재방문",
};
export const DIM: Record<string, string> = {
  verdict: "판정", country: "나라", org_kind: "기관 종류", src: "유입", device: "단말", law: "법령", topic: "분야",
};
