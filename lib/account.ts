/**
 * 로그인(선택)·동의·탈퇴·관리자 이용 추이 API 호출(T43). 모두 같은 도메인의 /api/v1 이라 세션 쿠키가 자동으로 실린다.
 * 백엔드에 nklaw_usage DB·OAuth env 가 없으면 auth/config 가 { login:false } — 화면은 로그인 메뉴를 숨긴다.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/** 약관·처리방침 문서 버전 — 백엔드 app/usage/settings.py DOC_VERSION 과 같아야 한다 */
export const DOC_VERSION = "2026-10-30.2"; // T47: 약관 6조(데이터 권리) 보강 — 회원 재동의

export interface AuthConfig {
  login: boolean;
  usage: boolean;
  doc_version: string;
}

export interface ConsentState {
  agreed: boolean;
  version: string;
  at: string;
}

export interface Me {
  user: { email: string; name: string | null; created_at: string; last_login_at: string } | null;
  consents?: Record<string, ConsentState>;
  is_admin?: boolean;
  doc_version?: string;
}

export interface Pending {
  pending: boolean;
  email?: string;
  name?: string | null;
  existing?: boolean;
}

export interface AdminUsage {
  days: number;
  daily: { day: string; kind: string; count: number }[];
  totals: Record<string, number>;
  top_laws: { name: string; count: number }[];
  top_queries: { query: string; count: number }[];
  users: { total: number; new: number; active: number; usage_opt_in: number };
  visitors?: AdminVisitors;   // T52
  // T83: region·org 는 지역·기관 판별 자료가 있는지, loading 은 기동 뒤 읽는 중인지
  geoip?: { available: boolean; attribution: string; attribution_url: string; region?: boolean; org?: boolean; loading?: boolean };
  // T67: 바깥 요청의 실제(공인) IP 를 못 받고 있는지 — 그동안 IP 기반 제한·국가·쿠키 없이 집계가 멈춘다
  // T82: missing_recent 는 프록시·도커 경로(172.16/12·127/8) 흔적이 공인 이상일 때만. LAN(공유기 헤어핀)은 정상.
  //      no_public_1h 는 정보(경고 아님), 재시작 뒤 1시간(warming_up) 동안은 false
  // T85: 역DNS 확인 동작 상태(프로세스 시작 뒤 누계) — DNS 가 답하지 않으면 사람 UA 는 사람으로 센다
  classifier?: {
    enabled: boolean; since_kst: string; cache_size: number; inflight: number;
    resolver?: "system" | "servers"; ptr_ok?: boolean | null;   // ptr_ok=false: 시스템 DNS 가 역DNS 에 답하지 않음(확인 실패로 셈)
    lookups: number; cache_hits: number; crawler: number; none: number; mismatch: number; unknown: number; timeouts: number; busy: number;
  };
  ip_status?: {
    missing_recent: boolean;
    public_1h?: number;
    lan_1h?: number;
    proxy_1h?: number;
    private_1h?: number;          // 사설 합계(lan + proxy)
    no_public_1h?: boolean;
    warming_up?: boolean;
    started_kst?: string | null;
    last_public_kst: string | null;
    last_lan_kst?: string | null;
    last_proxy_kst?: string | null;
  };
}

/** T52 방문자 수·국가·봇(/api/v1/admin/usage 의 visitors) */
export interface AdminVisitors {
  daily: { day: string; total: number; member: number; guest: number; cookieless: number; new: number; returning: number }[];
  weekly: { start: string; cookie_unique: number; member_unique: number; cookieless_daysum: number }[];
  monthly: { start: string; cookie_unique: number; member_unique: number; cookieless_daysum: number }[];
  // T91: 열람은 페이지(kind=page)와 법령 조회(law_view)를 따로
  countries: ({ country: string; visitors: number } & ViewCounts)[];
  // T85: renderer = 검색엔진 렌더러(사람 UA 로 화면 JS 를 실행한 수집기 — 역DNS+정방향 확인)
  bots: { kind: "search_bot" | "suspect" | "renderer"; name: string; hits: number }[];
  // T85: 분류 사유별 일일 건수 — kind: search_bot·suspect·renderer(방문자 수에서 뺌) | suspicious(사람으로 셈, 사유만) | internal
  classes?: { day: string; kind: "search_bot" | "suspect" | "renderer" | "suspicious" | "internal"; name: string; hits: number }[];
  // T82: 내부 접속(LAN 클라이언트·관리자 계정) — 이용 기록·방문자 수에서 뺀 요청의 건수(기간 합계·일별)
  // T90: device = 운영자 기기 쿠키, test = 점검 헤더
  internal?: InternalCounts & { days: ({ day: string } & InternalCounts)[] };
  // T83: 접속 지역(한국 시·도)·접속 기관(분류·표시 이름은 서버가 붙임)
  regions?: ({ region: string; visitors: number } & ViewCounts)[];
  orgs?: ({ org: string; kind: string; country: string | null; visitors: number } & ViewCounts)[];
  devices?: ({ device: "mobile" | "tablet" | "pc" | "unknown" | "none"; visitors: number } & ViewCounts)[];   // T88 — none = 기록 전
  sources?: AdminSources;   // T91: 유입 경로
  pending?: AdminPending;   // T113: 정산 대기(봇 의심) — 위 방문자 수에서 뺀 것
}

/** T113: 정산 대기 — 3f(데이터센터 단발)·3i(회전 프록시)·3j(해외 회선 수집 무리, T116)·3g(자동 열람). 수만(쿠키 ID 없음).
 * 3j 칸은 backend t116 부터 온다 — 그 전 backend 에는 없으므로 선택 값으로 받는다. */
export interface AdminPending {
  visitors_today: number;                                   // 오늘 방문자 수에서 뺀 줄
  days: { day: string; visitors: number }[];
  visitors_by_rule: { "3f": number; "3i": number; "3j"?: number; "3g": number };
  visits: { "3f": number; "3i": number; "3j"?: number; "3g_bursts": number; "3g_events": number };
  unmatched_visits: number;                                 // 재시작 복원 방문(쿠키를 몰라 방문자 수는 조정하지 않음)
  next_settle_kst: string | null;                           // 가장 이른 정산 예정(KST 'YYYY-MM-DD HH:MM')
  settle_after_min: number;                                 // 3f·3i·3j: 마지막 기록 뒤 이만큼
  auto_quiet_min: number;                                   // 3g: 묶음이 끝난 뒤 이만큼
}
export type PendingRule = "3f" | "3i" | "3j" | "3g";

/** T117: 정산 대기 규칙의 화면 이름(관리 화면 방문자 수·방문 목록이 같이 쓴다) */
export const PENDING_RULE_LABEL: Record<PendingRule, string> = {
  "3f": "데이터센터 단발", "3i": "회전 프록시", "3j": "해외 회선 수집 무리", "3g": "자동 열람",
};
export const PENDING_RULES: readonly PendingRule[] = ["3f", "3i", "3j", "3g"];

/** T117: 규칙별 대기 방문 수(3g 는 묶음 수) — 3j 칸이 없는 옛 backend 응답은 0 */
export function pendingVisitsByRule(p: AdminPending): [PendingRule, number][] {
  return PENDING_RULES.map((r) => [r, r === "3g" ? p.visits["3g_bursts"] : p.visits[r] ?? 0]);
}

/** T117: 방문 정산 대기(dc_pending 은 3f·3i·3j 를 모두 센다) — 규칙별로 풀어 쓴다(split·swarm 값이 없는 옛 backend 는 합만) */
export function settlePendingNote(s: { dc_pending: number; split_pending?: number; swarm_pending?: number }): string {
  const i = s.split_pending ?? 0;
  const j = s.swarm_pending ?? 0;
  const f = Math.max(0, s.dc_pending - i - j);
  if (s.split_pending === undefined && s.swarm_pending === undefined) return `방문 정산 대기 ${s.dc_pending}`;
  const parts = [[PENDING_RULE_LABEL["3f"], f], [PENDING_RULE_LABEL["3i"], i], [PENDING_RULE_LABEL["3j"], j]].filter(([, n]) => (n as number) > 0)
    .map(([l, n]) => `${l} ${n}`);
  return `방문 정산 대기 ${s.dc_pending}${parts.length ? `(${parts.join(" · ")})` : ""}`;
}

/** T117: 대기 방문 합(3f + 3i + 3j + 3g 묶음) */
export function pendingVisitsTotal(p: AdminPending): number {
  return pendingVisitsByRule(p).reduce((a, [, n]) => a + n, 0);
}

/** T91: 열람 페이지(kind=page)·법령 조회(law_view) 건수 */
export interface ViewCounts { pages: number; law_views: number }

/** T91: 유입 경로 — 방문(탭) 첫 페이지의 출처 분류별 방문 수와 출처 호스트 상위 */
export type SourceKind = "ai" | "search" | "social" | "other" | "direct";
export interface AdminSources {
  ready: boolean;
  by: { src: SourceKind; label: string; visits: number }[];
  hosts: { src: SourceKind; host: string; visits: number }[];
}

export interface InternalCounts { lan: number; admin: number; device?: number; test?: number }

async function call<T>(path: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const res = await fetch(`${API}/api/v1${path}`, { credentials: "same-origin", ...init });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const authConfig = () => call<AuthConfig>("/auth/config");
export const me = () => call<Me>("/auth/me");
export const pending = () => call<Pending>("/auth/pending");
export const submitConsent = (c: { terms: boolean; privacy_required: boolean; age14: boolean; usage_analysis: boolean }) =>
  call<{ ok?: boolean; error?: string }>("/auth/consent", json(c));
export const setUsageAnalysis = (on: boolean) =>
  call<{ ok?: boolean; unlinked_events?: number; error?: string }>("/auth/consent", { ...json({ usage_analysis: on }), method: "PATCH" });
export const logout = () => call<{ ok: boolean }>("/auth/logout", { method: "POST" });
export const withdraw = () => call<{ ok?: boolean; deleted?: boolean; error?: string }>("/auth/me", { method: "DELETE" });
export const adminUsage = (days: number) => call<AdminUsage & { ok?: boolean; error?: string }>(`/admin/usage?days=${days}`);

/** T89: 방문(탭) 단위 열람 순서 */
export interface AdminVisitRow {
  visit: string; start: string; last: string; span_sec: number; pages: number; law_views?: number; events: number; dwell_sec: number;
  region: string; org: string; org_kind: string; device: string;
  src?: SourceKind | "none"; src_host?: string | null;   // T91: 유입 경로(none = 기록 없음)
  pending?: { rule: PendingRule; settle_at: string };     // T113: 정산 대기 표지(정산 예정 KST 분)
}
export interface AdminVisits {
  ok?: boolean; error?: string; day: string; ready: boolean; total: number; visits: AdminVisitRow[];
  facets: Partial<Record<"region" | "org" | "device" | "src", { name: string; visits: number }[]>>;
}
export interface AdminVisitEvent { ts: string; kind: string; path: string | null; law: string | null; seq: number | null; dwell_sec: number | null }
export const adminVisits = (day: string, f: { region?: string; org?: string; device?: string; src?: string } = {}) => {
  const p = new URLSearchParams({ day });
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return call<AdminVisits>(`/admin/usage/visits?${p.toString()}`);
};
export const adminVisit = (visit: string) =>
  call<{ ok?: boolean; error?: string; visit: string; events: AdminVisitEvent[] }>(`/admin/usage/visits/${encodeURIComponent(visit)}`);

/** T90: 이 브라우저(운영자 기기)를 이용 통계에서 뺄지 — 서명 쿠키, 관리자만 */
export interface OpDevice { ok?: boolean; error?: string; on: boolean; auto: boolean; test_header: boolean }
export const adminOpDevice = () => call<OpDevice>("/admin/usage/opdev");
export const setAdminOpDevice = (on: boolean) => call<OpDevice>("/admin/usage/opdev", json({ on }));

/** T101: 방문 분석(정기 점검·원자료 분석의 방문별 판정) — 관리자만. 질의 문자열은 components/admin/analysisQuery.ts 가 만든다 */
export type AnalysisVerdict = "human" | "bot" | "hold";
export interface AnalysisStep { t: string; kind: string; path?: string | null; law?: string | null; dwell?: number | null; note?: string | null }
export interface AnalysisVisit {
  id: number; day: string; label: string | null; start: string; end: string | null;
  country: string | null; region: string | null; asn: number | null; org: string | null; org_kind: string;
  device: string; src: string; src_host: string | null; pages: number; law_views: number;
  dwell_sec: number | null; dwell_max: number | null; laws: string[]; topics: string[]; flow: AnalysisStep[];
  verdict: AnalysisVerdict; bot_kind: string | null; rules: string[]; summary: string; source: string;
}
export interface AdminAnalysis {
  ok?: boolean; error?: string; usage?: string; from: string; to: string; ready: boolean; total: number; visits: AnalysisVisit[];
  facets: Partial<Record<"verdict" | "country" | "src" | "org_kind" | "law", { name: string; visits: number }[]>>;
}
export interface AnalysisAggRow { start: string; dim: string; key: string; verdict: string; visits: number; pages: number }
export interface AdminAnalysisAggs {
  ok?: boolean; error?: string; usage?: string; period: "day" | "week"; from: string; to: string; ready: boolean;
  min_cell: number; rows: AnalysisAggRow[];
}
export const adminAnalysis = (qs: string) => call<AdminAnalysis>(`/admin/usage/analysis?${qs}`);
export const adminAnalysisAggs = (qs: string) => call<AdminAnalysisAggs>(`/admin/usage/analysis/aggs?${qs}`);
/** 집계 CSV 내려받기 주소(집계만 — 방문별 분석은 내려받지 않는다) */
export const analysisCsvHref = (qs: string) => `${API}/api/v1/admin/usage/analysis/aggs.csv?${qs}`;

/** 구글 로그인 시작 주소(next 는 사이트 안쪽 경로) */
export function loginHref(next = "/"): string {
  return `${API}/api/v1/auth/google/login?next=${encodeURIComponent(next)}`;
}
