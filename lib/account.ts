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
  countries: { country: string; visitors: number; views: number }[];
  // T85: renderer = 검색엔진 렌더러(사람 UA 로 화면 JS 를 실행한 수집기 — 역DNS+정방향 확인)
  bots: { kind: "search_bot" | "suspect" | "renderer"; name: string; hits: number }[];
  // T85: 분류 사유별 일일 건수 — kind: search_bot·suspect·renderer(방문자 수에서 뺌) | suspicious(사람으로 셈, 사유만) | internal
  classes?: { day: string; kind: "search_bot" | "suspect" | "renderer" | "suspicious" | "internal"; name: string; hits: number }[];
  // T82: 내부 접속(LAN 클라이언트·관리자 계정) — 이용 기록·방문자 수에서 뺀 요청의 건수(기간 합계·일별)
  internal?: { lan: number; admin: number; days: { day: string; lan: number; admin: number }[] };
  // T83: 접속 지역(한국 시·도)·접속 기관(분류·표시 이름은 서버가 붙임)
  regions?: { region: string; visitors: number; views: number }[];
  orgs?: { org: string; kind: string; country: string | null; visitors: number; views: number }[];
  devices?: { device: "mobile" | "tablet" | "pc" | "unknown" | "none"; visitors: number; views: number }[];   // T88 — none = 기록 전
}

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
  visit: string; start: string; last: string; span_sec: number; pages: number; events: number; dwell_sec: number;
  region: string; org: string; org_kind: string; device: string;
}
export interface AdminVisits {
  ok?: boolean; error?: string; day: string; ready: boolean; total: number; visits: AdminVisitRow[];
  facets: Record<"region" | "org" | "device", { name: string; visits: number }[]>;
}
export interface AdminVisitEvent { ts: string; kind: string; path: string | null; law: string | null; seq: number | null; dwell_sec: number | null }
export const adminVisits = (day: string, f: { region?: string; org?: string; device?: string } = {}) => {
  const p = new URLSearchParams({ day });
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return call<AdminVisits>(`/admin/usage/visits?${p.toString()}`);
};
export const adminVisit = (visit: string) =>
  call<{ ok?: boolean; error?: string; visit: string; events: AdminVisitEvent[] }>(`/admin/usage/visits/${encodeURIComponent(visit)}`);

/** 구글 로그인 시작 주소(next 는 사이트 안쪽 경로) */
export function loginHref(next = "/"): string {
  return `${API}/api/v1/auth/google/login?next=${encodeURIComponent(next)}`;
}
