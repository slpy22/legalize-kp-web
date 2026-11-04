/* ── API 응답 래퍼 ── */
export interface ApiResponse<T> {
  ok: boolean;
  elapsed: number;
  total: number;
  page?: number;
  per_page?: number;
  total_pages?: number;
  data: T;
}

/* ── 법령 요약 (ref?category= 의 laws 배열 항목) ── */
export interface LawSummary {
  id: number;
  name: string;
  category: string;
  enactment_date: string | null;
  latest_version_date: string | null;
  total_articles: number | null;
  chapter_count: number;
  amendment_count: number;
  source: string;
  name_alias?: string[] | string | null;   // T50: 자동완성 별칭(목록 API 가 frontmatter name_alias 를 그대로 준다)
  aliases?: string[];                      // T54: 별칭·약칭·옛 이름을 합친 목록
  text_unavailable?: boolean;              // T54: 본문 미확보 법령
}

/* ── 출처 표시 (T7) ── */
export interface SourceDesc {
  code: string | null;
  name?: string | null;
  label?: string | null;
  desc?: string | null;
  unverified?: boolean;
  unofficial?: boolean; // T26: 비공식 재입력본 출처(데일리NK) — '비정본' 배지
  credit?: string | null; // T26: 이용허락 출처 표기명
}

/** 출처·OCR·국정원수록 여부. 화면은 labels 를 배지로 그린다.
 *  nis_edition 은 '국정원 법령집 수록본(출처==nis)' 여부로 신뢰도가 아니다(없으면 null). */
export interface Provenance {
  source: string | null;
  source_desc: SourceDesc;
  label: string | null;
  is_ocr: boolean;
  nis_edition: boolean | null;
  labels: string[]; // 예: ["NK TechLab", "미검증 OCR"], ["데일리NK 재입력본", "비정본"]
  excerpt?: boolean;
  unofficial?: boolean;          // T26: 출처 단위 비정본 표시(정본여부와 무관)
  credit?: string | null;        // T26: 화면에 '출처: …' 로 표기
  source_url?: string | null;    // T26: 판본 원문이 실린 기사 주소(frontmatter 출처URL)
  source_note?: string | null;   // T26: frontmatter 출처비고
  version_note?: string | null;  // T26: frontmatter 판본비고(표시 없이 빠진 조 등)
}

export interface DateDispute {
  항목: string;
  원문값: string;
  이견값: string;
  출처: string;
  비고?: string;
}

export interface LawMeta {
  source_desc: SourceDesc;
  provenance: Provenance;
  aliases: string[];
  date_disputes: DateDispute[];
  text?: TextStatus;   // T54: 본문 보유 상태
  adopted_note?: string; // T79: 채택일 설명(frontmatter 채택일설명) — 있는 법령만
}

/** 본문 보유 상태(T54) — available=false 면 본문 미확보 법령(근거·확실성 동봉) */
export interface TextStatus {
  available: boolean;
  adopted?: string | null;        // T54 ver2: 채택 일자('YYYY-MM' 처럼 월까지만 알 수도)
  latest?: string | null;         // T54 ver2: 알려진 마지막 일자
  state?: string;                 // 미확보 | 일부조문인용
  certainty?: string | null;      // 확인 | 추정
  existence_basis?: string | null; // 강 | 중 | 약
  name_confirmed?: boolean | null;
  evidence?: { type: string | null; title: string | null; author: string | null; issue: string | null; date: string | null; page: string | null; url: string | null }[];
  same_law_review?: Record<string, unknown> | null;
  center_tracked_id?: string | null;
  notice?: string;
}

/* ── 조문 ── */
export interface Article {
  id: number;
  law_id: number;
  article_number: string;
  article_title: string;
  content: string;
  chapter: string;
  position: number;
}

/* ── 법령 상세 (action=get) ── */
export interface LawDetail {
  law: {
    id: number;
    name: string;
    category: string;
    enactment_date: string | null;
    latest_version_date: string | null;
    total_articles: number | null;
    chapter_count: number;
    amendment_count: number;
    source: string;
    frontmatter: Record<string, unknown>;
    full_text?: string;
  };
  articles: Article[];
  total_articles: number;
  meta?: LawMeta; // T4/T7: 출처 설명·출처표시·별칭·날짜이견
  excerpt?: ExcerptInfo; // T66: 최신 판본이 일부본이면 빠진 조와 직전 전문 판본
}

/** T66: 최신 판본이 일부본(발췌본)일 때 — 빠진 조는 직전 전문 판본에서(최신 판본에 합치지 않음) */
export interface ExcerptInfo {
  latest_version: string;
  fallback_version: string;
  fallback_source: string | null;
  missing: string[];
  notice: string;
}

/* ── 개정 내역 ── */
export interface Amendment {
  id: number | string;
  law_id: number;
  date: string;
  action: string;
  basis: string | null;
  has_text?: boolean;     // 해당 시점 본문을 보유(법령 버전 조회·신구대조 가능)
  source?: string | null; // 본문 출처 (nis/mobu/unification/nktechlab/dailynk)
  effective_date?: string | null;
  unverified?: boolean;           // T7: 원문 미확보 개정(이력추가 주석) — 본문 없음
  external_basis?: string | null; // T7: 외부근거(학보 등 자료명·호수·doc_id)
  note?: string | null;           // T7: 비고
  provenance?: Provenance | null; // 본문 보유 판본의 출처 표시
}

/** 센터 추적 개정 이력(T47) — 공식 공개 이력과 별개로 센터가 북한 매체·학보 논문 등으로 추적한 개정 */
export interface CenterTracked {
  id: string | null;
  law: string;
  date: string;
  action: string;
  kind: "이력추가" | "날짜이견";
  decree: string | null;
  summary: string;
  certainty: "확인" | "추정";
  evidence: {
    type: string | null;
    title: string | null;
    author: string | null;
    issue: string | null;
    date: string | null;
    page: string | null;
    url: string | null;
  }[];
  in_official: boolean;
  official_note: string | null;
  needs_check: boolean;
}

export interface HistoryData {
  law_name: string;
  amendments: Amendment[];
  center_tracked?: CenterTracked[];
  text?: TextStatus;   // T54
  provenance?: Provenance;
  date_disputes?: DateDispute[];
  aliases?: string[];
}

/* ── 검색 결과 ── */
export interface MatchingArticle {
  id: number;
  law_id: number;
  article_number: string;
  article_title: string;
  content: string;
  chapter: string;
  position: number;
  law_name: string;
  category: string;
  rank: number;
}

export interface SearchResultItem {
  law_name: string;
  category: string;
  score: number;
  source: string;          // 검색 경로(keyword/semantic) — 데이터 출처가 아님
  matching_articles?: MatchingArticle[];
  provenance?: Provenance; // T7: 데이터 출처·OCR 표시
}

export interface SearchData {
  total: number;
  results: SearchResultItem[];
  mode: string;
}

/* ── 페이지네이션 메타 정보 ── */
export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/* ── 카테고리 ── */
export interface CategoryInfo {
  category: string;
  count: number;
}

/* ── 참조 데이터 (카테고리 목록 + 총 법령 수) ── */
export interface RefData {
  total_laws: number;
  total_with_text?: number;      // T54: 본문 보유
  total_unavailable?: number;    // T54: 본문 미확보
  categories: CategoryInfo[];
}

/* ── 카테고리별 법령 목록 ── */
export interface CategoryLawsData {
  category: string;
  laws: LawSummary[];
}

/* ── 신구대조 (diff) ── */
export interface DiffData {
  law_name: string;
  date_range: string[];
  amendments: Amendment[];
  total: number;
}

/* ── law_versions ── */
export interface LawVersionMeta {
  id: number;
  law_id: number;
  version_date: string;
  action: string | null;
  source: string | null;
  source_desc?: SourceDesc;
  provenance?: Provenance; // T7
}

export interface LawVersionsData {
  law_name: string;
  versions: LawVersionMeta[];
  total: number;
}

/** 이름 해석 응답 (action=resolve) — T97: 못 찾으면 candidates 에 비슷한 이름(확실한 1개만 confident) */
export interface LawResolveCandidate {
  id: number;
  name: string;
  matched_by: string;
  confident?: boolean;
  /** T98: 화면에 보일 이유(옛이름 「…」 · 남한 「…」에 대응 · 관련 있을 수 있음 등) */
  reason?: string | null;
  /** T98: 의미 검색 점수(matched_by=semantic) */
  score?: number;
}

export interface LawResolveData {
  input: string;
  resolved: string | null;
  law_id: number | null;
  matched_by: string | null;
  candidates: LawResolveCandidate[];
  hint: string | null;
  /** T100: 옛이름·다른 이름·약칭으로 해석했을 때(matched_by=alias) 그 이유 — '옛이름 「사회주의헌법」' */
  reason?: string | null;
  /** T98: 의미 검색 층 상태(used·cached·skipped:…) — 불렀을 때만 */
  semantic?: string;
}

/** 특정 버전 본문 조회 응답 (action=get&version=...) */
export interface LawVersionDetail {
  law: LawDetail["law"];
  version: {
    version_date: string;
    action: string | null;
    source: string | null;
    frontmatter: Record<string, unknown>;
    full_text: string;
    source_desc?: SourceDesc;
    provenance?: Provenance;     // T7: 이 판본의 출처 표시
    date_disputes?: DateDispute[];
  };
  meta?: LawMeta;
  articles: Article[];
  total_articles: number;
}

/** 두 버전 본문 비교 응답 (action=diff_text) */
export interface DiffTextSide {
  version_date: string;
  action: string | null;
  source: string | null;
  articles: Article[];
  full_text: string;
}

export interface DiffTextData {
  law_name: string;
  from: DiffTextSide;
  to: DiffTextSide;
}

/** 의미 기반 신구비교 (action=diff_semantic) */
export type DiffKind = "added" | "removed" | "modified" | "same";

export interface SemanticDiffArticle {
  article_number: string;
  article_title?: string;
  content?: string;
  chapter?: string | null;
}

export interface SemanticDiffPair {
  kind: DiffKind;
  similarity?: number | null;
  from: SemanticDiffArticle | null;
  to: SemanticDiffArticle | null;
}

export interface SemanticDiffData {
  law_name: string;
  method: "semantic" | "article_number";
  match_threshold: number;
  from: { version_date: string; action: string | null; source: string | null };
  to: { version_date: string; action: string | null; source: string | null };
  summary: { added: number; removed: number; modified: number; same: number };
  pairs: SemanticDiffPair[];
}

/** 의미론적 변화 리포트 (action=diff_report)
 *
 * 만드는 데 1~2분 걸려 서버가 백그라운드로 만들고 저장한다. status 로 구분한다.
 * - done: 리포트(cached=저장본에서 바로, generated_at=만든 시각)
 * - pending: 만드는 중 — poll_after_sec 뒤 같은 요청을 다시 보낸다
 * - failed: message 에 실패 사유, retry_after_sec 뒤 다시 시도하면 새로 만든다
 * status 가 없으면(예전 서버) done 으로 본다.
 */
export interface DiffReportData {
  status?: "done" | "pending" | "failed";
  law_name: string;
  from: { version_date: string; action?: string | null; source?: string | null };
  to: { version_date: string; action?: string | null; source?: string | null };
  summary?: { added: number; removed: number; modified: number; same: number };
  method?: "semantic" | "article_number";
  report?: string; // 마크다운
  cached?: boolean;
  generated_at?: string;
  elapsed_sec?: number;
  poll_after_sec?: number;
  retry_after_sec?: number;
  message?: string;
  error?: string;
}

/* ── 법령 개요 ── */
export interface OverviewData {
  name: string;
  summary: string;
  keywords: string[];
}

/* ── 남북법 비교 ── */
export interface CompareData {
  kp_name: string;
  kr_name: string;
  kp_articles: Article[];
  kr_articles: Article[];
  analysis: string;
}
