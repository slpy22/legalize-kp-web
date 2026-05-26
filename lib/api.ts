import type {
  ApiResponse,
  PaginationMeta,
  RefData,
  CategoryLawsData,
  LawDetail,
  HistoryData,
  SearchData,
  DiffData,
  OverviewData,
  CompareData,
  LawVersionsData,
  LawVersionDetail,
  DiffTextData,
  SemanticDiffData,
  DiffReportData,
} from "./types";

// 서버 컴포넌트에서는 내부 URL, 클라이언트에서는 상대 경로
const BASE =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "");

/* ── 헬퍼 ── */
async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json: ApiResponse<T> = await res.json();
  return json.data;
}

/** 페이지네이션 메타 포함 응답용 헬퍼 */
async function apiWithMeta<T>(
  path: string,
): Promise<{ data: T; meta: PaginationMeta }> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  const json: ApiResponse<T> = await res.json();
  return {
    data: json.data,
    meta: {
      total: json.total ?? 0,
      page: json.page ?? 1,
      per_page: json.per_page ?? 10,
      total_pages: json.total_pages ?? 1,
    },
  };
}

/* ══════════════════════════════════════
   SSG / 서버 컴포넌트용 (빌드 시 호출)
   ══════════════════════════════════════ */

/** 카테고리 목록 + 총 법령 수 */
export async function fetchCategories(): Promise<RefData> {
  return api<RefData>("/api/v1/ref");
}

/** 특정 카테고리의 법령 목록 (SSG용 - 전체 반환) */
export async function fetchLawsByCategory(
  category: string,
): Promise<CategoryLawsData> {
  return api<CategoryLawsData>(
    `/api/v1/ref?category=${encodeURIComponent(category)}&per_page=500`,
  );
}

/** 법령 상세 (선택적으로 특정 버전 본문) */
export async function fetchLaw(
  name: string,
  version?: string,
): Promise<LawDetail | LawVersionDetail> {
  const v = version ? `&version=${encodeURIComponent(version)}` : "";
  return api<LawDetail | LawVersionDetail>(
    `/api/v1/law?action=get&name=${encodeURIComponent(name)}${v}`,
  );
}

/** 적재된 버전 메타 목록 */
export async function fetchLawVersions(name: string): Promise<LawVersionsData> {
  return api<LawVersionsData>(
    `/api/v1/law?action=versions&name=${encodeURIComponent(name)}`,
  );
}

/** 두 버전 본문 비교 (조문 단위 diff 렌더용 raw data) */
export async function fetchDiffText(
  name: string,
  fromDate: string,
  toDate: string,
): Promise<DiffTextData> {
  return api<DiffTextData>(
    `/api/v1/law?action=diff_text&name=${encodeURIComponent(name)}&date1=${fromDate}&date2=${toDate}`,
  );
}

/** 의미 기반 신구비교 — 조문을 임베딩 유사도로 매칭해 신설/삭제/변경/동일 분류 */
export async function fetchDiffSemantic(
  name: string,
  fromDate: string,
  toDate: string,
  threshold?: number,
): Promise<SemanticDiffData> {
  const t = threshold != null ? `&threshold=${threshold}` : "";
  return api<SemanticDiffData>(
    `/api/v1/law?action=diff_semantic&name=${encodeURIComponent(name)}&date1=${fromDate}&date2=${toDate}${t}`,
  );
}

/** 의미론적 변화 리포트 — diff_semantic 결과를 LLM이 체계적 마크다운 리포트로 종합 */
export async function fetchDiffReport(
  name: string,
  fromDate: string,
  toDate: string,
): Promise<DiffReportData> {
  return api<DiffReportData>(
    `/api/v1/law?action=diff_report&name=${encodeURIComponent(name)}&date1=${fromDate}&date2=${toDate}`,
  );
}

/** 개정 이력 */
export async function fetchHistory(name: string): Promise<HistoryData> {
  return api<HistoryData>(
    `/api/v1/law?action=history&name=${encodeURIComponent(name)}`,
  );
}

/** 모든 법령 이름 목록 (generateStaticParams 용) — ref 카테고리별로 수집 */
export async function fetchAllLawNames(): Promise<string[]> {
  const ref = await fetchCategories();
  const names: string[] = [];
  for (const cat of ref.categories) {
    const data = await fetchLawsByCategory(cat.category);
    for (const law of data.laws) {
      names.push(law.name);
    }
  }
  return names;
}

/* ══════════════════════════════════════
   CSR용 (클라이언트에서 호출)
   ══════════════════════════════════════ */

/** 검색 */
export async function searchLaws(
  query: string,
  mode: string = "keyword",
  page: number = 1,
  perPage: number = 10,
): Promise<{ data: SearchData; meta: PaginationMeta }> {
  return apiWithMeta<SearchData>(
    `/api/v1/law?action=search&q=${encodeURIComponent(query)}&mode=${mode}&page=${page}&per_page=${perPage}`,
  );
}

/** 신구대조 (diff) */
export async function fetchDiff(
  name: string,
  date1: string,
  date2: string,
): Promise<DiffData> {
  return api<DiffData>(
    `/api/v1/law?action=diff&name=${encodeURIComponent(name)}&date1=${date1}&date2=${date2}`,
  );
}

/** 남북법 비교 */
export async function fetchCompare(
  kpName: string,
  krQuery: string,
): Promise<CompareData> {
  return api<CompareData>(
    `/api/v1/tools?action=compare&kp_name=${encodeURIComponent(kpName)}&kr_query=${encodeURIComponent(krQuery)}`,
  );
}

/** 법령 개요 (AI 요약) */
export async function fetchOverview(name: string): Promise<OverviewData> {
  return api<OverviewData>(
    `/api/v1/tools?action=overview&name=${encodeURIComponent(name)}`,
  );
}

/* ══════════════════════════════════════
   남북법 비교 (compare endpoint)
   ══════════════════════════════════════ */

/** 매핑 목록 */
export async function fetchMappings(
  category?: string,
  page: number = 1,
  perPage: number = 10,
  q?: string,
) {
  let url = `/api/v1/compare/?action=mapping&page=${page}&per_page=${perPage}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  return apiWithMeta<any>(url);
}

/** 비교 상세 */
export async function fetchCompareDetail(kpName: string) {
  return api<any>(
    `/api/v1/compare/?action=detail&kp_name=${encodeURIComponent(kpName)}`,
  );
}

/** 조문 비교 */
export async function fetchCompareArticles(kpName: string, krName: string) {
  return api<any>(
    `/api/v1/compare/?action=articles&kp_name=${encodeURIComponent(kpName)}&kr_name=${encodeURIComponent(krName)}`,
  );
}

/** 용어 대조표 */
export async function fetchCompareTerms(
  query?: string,
  category?: string,
  page: number = 1,
  perPage: number = 10,
) {
  let url = `/api/v1/compare/?action=terms&page=${page}&per_page=${perPage}`;
  if (query) url += `&q=${encodeURIComponent(query)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return apiWithMeta<any>(url);
}

/** 체계 비교 */
export async function fetchCompareStructure(kpName: string, krName: string) {
  return api<any>(
    `/api/v1/compare/?action=structure&kp_name=${encodeURIComponent(kpName)}&kr_name=${encodeURIComponent(krName)}`,
  );
}
