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
  };
  articles: Article[];
  total_articles: number;
}

/* ── 개정 내역 ── */
export interface Amendment {
  id: number;
  law_id: number;
  date: string;
  action: string;
  basis: string | null;
}

export interface HistoryData {
  law_name: string;
  amendments: Amendment[];
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
  source: string;
  matching_articles?: MatchingArticle[];
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
  };
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
