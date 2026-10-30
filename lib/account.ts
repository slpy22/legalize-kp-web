/**
 * 로그인(선택)·동의·탈퇴·관리자 이용 추이 API 호출(T43). 모두 같은 도메인의 /api/v1 이라 세션 쿠키가 자동으로 실린다.
 * 백엔드에 nklaw_usage DB·OAuth env 가 없으면 auth/config 가 { login:false } — 화면은 로그인 메뉴를 숨긴다.
 */
const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/** 약관·처리방침 문서 버전 — 백엔드 app/usage/settings.py DOC_VERSION 과 같아야 한다 */
export const DOC_VERSION = "2026-10-30";

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
