/**
 * 이용 기록 보내기(T43). 본문에 식별자(기기 정보 등)를 넣지 않는다 — 서버가 익명으로 센다.
 * 로그인 회원은 '이용 기록 분석'에 선택 동의한 경우에만 서버가 계정과 연결한다(세션 쿠키로 판단).
 * T52: 방문자 수는 서버가 주는 1st-party 방문자 쿠키(nklaw_vid, 무작위 ID)로 센다 — 페이지 기록은 그 쿠키를 받도록 fetch 로 보낸다.
 * 브라우저의 GPC(Global Privacy Control) 신호가 켜져 있으면 이용 기록을 보내지 않고, 페이지 이동 때 식별자 없는 '방문 신호'만
 * 보낸다(서버가 쿠키 없이 그날 해시로만 센다, 처리방침 10조). 실패해도 화면에 영향이 없다.
 * T89: 한 번의 방문 안의 열람 순서·페이지별 머문 시간 — 이 탭의 sessionStorage 에만 두는 무작위 임시 방문 ID(탭을 닫으면 사라짐)로
 * 기록을 묶는다. 방문자 쿠키·회원·IP 와 잇지 않는다. GPC 를 켰거나 쿠키를 막은 브라우저는 만들지 않는다.
 * 'kind' 는 백엔드 app/usage/repo.py KINDS 와 같다.
 */
export type TrackKind = "page" | "law_view" | "search" | "diff" | "compare" | "terms" | "chat";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const TAB_KEY = "nklaw_tab";        // 임시 방문 ID
const SEQ_KEY = "nklaw_tab_seq";    // 이 탭 안의 페이지 순번
export const DWELL_MAX = 3600;      // 한 페이지 머문 시간 상한(초) — 서버와 같다

function gpc(): boolean {
  return Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl);
}

/** 이 탭의 임시 방문 ID(무작위 22자). GPC·쿠키 차단·저장소를 못 쓰면 null. */
export function tabVisit(): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (gpc() || !navigator.cookieEnabled) return null;
    let v = sessionStorage.getItem(TAB_KEY);
    if (!v || !/^[A-Za-z0-9_-]{16,40}$/.test(v)) {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      v = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      sessionStorage.setItem(TAB_KEY, v);
    }
    return v;
  } catch {
    return null;
  }
}

/** 이 탭의 다음 페이지 순번(1부터). 임시 방문 ID 가 없으면 null. */
export function nextSeq(): number | null {
  if (!tabVisit()) return null;
  try {
    const n = (parseInt(sessionStorage.getItem(SEQ_KEY) ?? "0", 10) || 0) + 1;
    if (n > 100_000) return null;
    sessionStorage.setItem(SEQ_KEY, String(n));
    return n;
  } catch {
    return null;
  }
}

function beacon(url: string, body: string): void {
  // sendBeacon 은 페이지를 떠나는 중에도 보내진다. text/plain 이라 미리보기(preflight) 요청이 없다
  if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
  void fetch(url, { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
}

export function track(kind: TrackKind, data: { law?: string; path?: string; query?: string; seq?: number } = {}): void {
  if (typeof window === "undefined") return;
  try {
    if (gpc()) {
      if (kind === "page") void fetch(`${API}/api/v1/usage/visit`, { method: "POST", keepalive: true, credentials: "omit" }).catch(() => {});
      return;
    }
    const visit = tabVisit();
    const { seq, ...rest } = data;
    const body = JSON.stringify({ kind, ...rest, ...(visit ? { visit, ...(seq ? { seq } : {}) } : {}) });
    const url = `${API}/api/v1/usage/event`;
    // 페이지 기록은 응답의 방문자 쿠키를 받아야 하므로 fetch(같은 출처, 쿠키 포함)로 보낸다
    if (kind === "page") {
      void fetch(url, { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
      return;
    }
    beacon(url, body);
  } catch {
    // 기록 실패는 무시한다
  }
}

/** T89: 이 탭의 seq 번째 페이지에 보이는 상태로 머문 시간(초, 누계). 서버는 큰 값만 남긴다. */
export function trackDwell(seq: number, sec: number): void {
  if (typeof window === "undefined" || sec <= 0) return;
  try {
    const visit = tabVisit();
    if (!visit) return;
    beacon(`${API}/api/v1/usage/dwell`, JSON.stringify({ visit, seq, sec: Math.min(DWELL_MAX, Math.round(sec)) }));
  } catch {
    // 기록 실패는 무시한다
  }
}
