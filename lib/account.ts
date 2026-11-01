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
  geoip?: { available: boolean; attribution: string; attribution_url: string };
  // T67: 바깥 요청의 실제(공인) IP 를 못 받고 있는지 — 그동안 IP 기반 제한·국가·쿠키 없이 집계가 멈춘다
  // T71: missing_recent 는 사설만 있고 공인이 1시간 넘게 없을 때만. 최근 1시간 바깥 API 요청 수(공인·사설)
  ip_status?: {
    missing_recent: boolean;
    last_missing_kst: string | null;
    last_public_kst: string | null;
    public_1h?: number;
    private_1h?: number;
  };
}

/** T52 방문자 수·국가·봇(/api/v1/admin/usage 의 visitors) */
export interface AdminVisitors {
  daily: { day: string; total: number; member: number; guest: number; cookieless: number; new: number; returning: number }[];
  weekly: { start: string; cookie_unique: number; member_unique: number; cookieless_daysum: number }[];
  monthly: { start: string; cookie_unique: number; member_unique: number; cookieless_daysum: number }[];
  countries: { country: string; visitors: number; views: number }[];
  bots: { kind: "search_bot" | "suspect"; name: string; hits: number }[];
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

/** 구글 로그인 시작 주소(next 는 사이트 안쪽 경로) */
export function loginHref(next = "/"): string {
  return `${API}/api/v1/auth/google/login?next=${encodeURIComponent(next)}`;
}
