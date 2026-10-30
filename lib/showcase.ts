/**
 * 홈·기능 페이지 첫 화면의 강점 미리보기 사례(T42).
 *
 * 2026-10-30 공개 API(www.nk-law.kr) 값을 옮긴 정적 데이터다. 홈을 열 때마다 무거운 diff_semantic·LLM 을
 * 부르지 않으려고 상수로 둔다. 각 카드의 버튼이 실제 페이지로 가므로 최신값은 그곳에서 확인된다.
 * 조문은 원문 그대로 인용하고 평가 문구는 붙이지 않는다.
 */

const CONSTITUTION = "조선민주주의인민공화국 헌법";

export interface DiffShowcase {
  lawName: string;
  shortName: string;
  date1: string;
  date2: string;
  summary: { modified: number; added: number; removed: number; same: number };
  /** 원문 조각. kind: added(신설)·removed(삭제)·modified(변경, before→after) */
  excerpts: { kind: "added" | "removed" | "modified"; label: string; text: string; before?: string }[];
}

/** 신구비교 대표 사례 — diff_semantic(헌법 2023-09-27 → 2026-03-23) */
const CONSTITUTION_DIFF: DiffShowcase = {
  lawName: CONSTITUTION,
  shortName: "헌법",
  date1: "2023-09-27",
  date2: "2026-03-23",
  summary: { modified: 107, added: 8, removed: 12, same: 53 },
  excerpts: [
    {
      kind: "added",
      label: "신설 제2조",
      text: "조선민주주의인민공화국 령역은 북쪽으로 중화인민공화국과 로씨야련방, 남쪽으로 대한민국과 접하고있는 령토와 그에 기초하여 설정된 령해와 령공을 포함한다.",
    },
    {
      kind: "removed",
      label: "삭제 옛 제9조",
      text: "…자주, 평화통일, 민족대단결의 원칙에서 조국통일을 실현하기 위하여 투쟁한다.",
    },
    {
      kind: "modified",
      label: "변경 제1조",
      before: "조선민주주의인민공화국은 전체 조선인민의 리익을 대표하는 자주적인 사회주의국가이다.",
      text: "우리 나라의 국호는 조선민주주의인민공화국이다.",
    },
  ],
};

/** 정치색이 덜한 대체 사례 — diff_semantic(외국인투자법 2011-11-29 → 2022-03-01) */
const FOREIGN_INVESTMENT_DIFF: DiffShowcase = {
  lawName: "외국인투자법",
  shortName: "외국인투자법",
  date1: "2011-11-29",
  date2: "2022-03-01",
  summary: { modified: 8, added: 0, removed: 0, same: 14 },
  excerpts: [
    {
      kind: "modified",
      label: "변경 제8조",
      before: "…외국인투자기업은 소득세를 비롯한 여러가지 세금의 감면, 유리한 토지리용조건의 보장, 은행대부의 우선적제공 같은 우대를 받는다.",
      text: "…외국투자기업은 세금적용에서의 특혜, 유리한 토지리용조건의 보장, 은행대부의 우선적제공 같은 우대를 받는다.",
    },
    {
      kind: "modified",
      label: "변경 제7조",
      before: "국가는 첨단기술을 비롯한 현대적기술과 국제시장에서 경쟁력이 높은 제품을 생산하는 부문, …",
      text: "국가는 첨단기술을 비롯한 선진기술을 도입하는 부문, 국제시장에서 경쟁력이 높은 제품을 생산하는 부문, …",
    },
  ],
};

export const DIFF_SHOWCASES = { constitution: CONSTITUTION_DIFF, "foreign-investment": FOREIGN_INVESTMENT_DIFF };
export type DiffShowcaseKey = keyof typeof DIFF_SHOWCASES;

/**
 * 홈 맨 앞 카드에 쓸 사례. 기본은 헌법. 서버 env NKLAW_HOME_DIFF=foreign-investment 로 다시 빌드하지 않고
 * 정치색이 덜한 사례로 바꿀 수 있다(서버 컴포넌트에서만 부른다).
 */
export function homeDiffShowcase(): DiffShowcase {
  const key = (process.env.NKLAW_HOME_DIFF || "constitution") as DiffShowcaseKey;
  return DIFF_SHOWCASES[key] ?? CONSTITUTION_DIFF;
}

/** 신구비교 페이지의 대표 비교 바로가기 — 판본 날짜는 공개 API versions 기준 */
export const DIFF_QUICK_PICKS: { label: string; name: string; date1: string; date2: string }[] = [
  { label: "헌법 2023 → 2026", name: CONSTITUTION, date1: "2023-09-27", date2: "2026-03-23" },
  { label: "형법 2022 → 2023", name: "형법", date1: "2022-05-17", date2: "2023-12-24" },
  { label: "형사소송법 2023 → 2025", name: "형사소송법", date1: "2023-05-30", date2: "2025-02-18" },
  { label: "외국인투자법 2011 → 2022", name: "외국인투자법", date1: "2011-11-29", date2: "2022-03-01" },
];

export function diffHref(name: string, date1?: string, date2?: string): string {
  const p = new URLSearchParams({ name });
  if (date1) p.set("date1", date1);
  if (date2) p.set("date2", date2);
  return `/diff?${p.toString()}`;
}

/** 남북 법률 비교 대표 사례 — compare detail(형법) */
export const COMPARE_SHOWCASE = {
  kpName: "형법",
  krName: "형법",
  relationship: "부분 일치",
  overlap: ["범죄 및 형벌 규정", "죄형법정주의", "속지주의(령역원칙)"],
  kpUnique: "‘계급적 원칙’을 견지하여 징벌과 관대를 적용하고 ‘사회적 교양’을 위주로 하는 형벌 처리 원칙",
  articleMap: { kp: "제7조(령역원칙)", kr: "형법 제2조(대한민국영역 내에서의 범죄)" },
};

/** 남북비교 페이지 첫 화면의 대표 사례 바로가기 */
export const COMPARE_QUICK_PICKS = ["형법", "민법", "형사소송법", "외국인투자법"];

/** 법용어 비교 대표 사례 — compare terms */
export const TERM_SHOWCASE: { kp: string; kr: string }[] = [
  { kp: "로동교화형", kr: "징역형" },
  { kp: "인민보안", kr: "경찰" },
  { kp: "재판소", kr: "법원" },
  { kp: "공민", kr: "국민" },
  { kp: "간석지", kr: "간척지" },
  { kp: "변호원", kr: "변호사" },
];

/** AI 상담 예시 질문 — 누르면 사이드바가 열리며 바로 전송된다 */
export const AI_EXAMPLES = [
  "2026년 헌법 개정에서 영토 조항은 어떻게 바뀌었어?",
  "북한 형법의 로동교화형은 어떤 처벌이야?",
  "외국인 투자와 관련된 북한 법령을 알려줘",
];

/** 법령 찾기 첫 화면의 예시 검색어 */
export const SEARCH_EXAMPLES = ["외국인투자", "선거권", "토지", "저작권", "로동"];

/** 사용자별 바로가기 */
export const AUDIENCES: { who: string; task: string; label: string; href: string }[] = [
  { who: "연구자", task: "개정 흐름과 의미 변화를 판본별로 분석", label: "헌법 판본 비교", href: diffHref(CONSTITUTION, "2023-09-27", "2026-03-23") },
  { who: "법조인", task: "북한 규정에 대응하는 남한 법·조문 확인", label: "형법 남북 비교", href: "/compare/" + encodeURIComponent("형법") },
  { who: "학생", task: "낯선 북한 법률 용어를 남한 용어로 이해", label: "용어 비교", href: "/compare/terms" },
  { who: "언론", task: "최근 개정의 핵심 변화와 근거 조문 파악", label: "대표 비교 보기", href: "/diff" },
  { who: "일반", task: "궁금한 것을 말로 묻고 근거 조문과 함께 답 받기", label: "AI 에게 묻기", href: "#ai" },
];
