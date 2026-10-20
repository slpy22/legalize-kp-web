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

export interface HistoryData {
  law_name: string;
  amendments: Amendment[];
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

/** 의미론적 변화 리포트 (action=diff_report) */
export interface DiffReportData {
  law_name: string;
  from: { version_date: string; action: string | null; source: string | null };
  to: { version_date: string; action: string | null; source: string | null };
  summary: { added: number; removed: number; modified: number; same: number };
  method: "semantic" | "article_number";
  report: string; // 마크다운
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
