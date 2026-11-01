/**
 * 이용 기록 보내기(T43). 본문에 식별자(기기 정보 등)를 넣지 않는다 — 서버가 익명으로 센다.
 * 로그인 회원은 '이용 기록 분석'에 선택 동의한 경우에만 서버가 계정과 연결한다(세션 쿠키로 판단).
 * T52: 방문자 수는 서버가 주는 1st-party 방문자 쿠키(nklaw_vid, 무작위 ID)로 센다 — 페이지 기록은 그 쿠키를 받도록 fetch 로 보낸다.
 * 브라우저의 GPC(Global Privacy Control) 신호가 켜져 있으면 이용 기록을 보내지 않고, 페이지 이동 때 식별자 없는 '방문 신호'만
 * 보낸다(서버가 쿠키 없이 그날 해시로만 센다, 처리방침 10조). 실패해도 화면에 영향이 없다.
 * 'kind' 는 백엔드 app/usage/repo.py KINDS 와 같다.
 */
export type TrackKind = "page" | "law_view" | "search" | "diff" | "compare" | "terms" | "chat";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

export function track(kind: TrackKind, data: { law?: string; path?: string; query?: string } = {}): void {
  if (typeof window === "undefined") return;
  try {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) {
      if (kind === "page") void fetch(`${API}/api/v1/usage/visit`, { method: "POST", keepalive: true, credentials: "omit" }).catch(() => {});
      return;
    }
    const body = JSON.stringify({ kind, ...data });
    const url = `${API}/api/v1/usage/event`;
    // 페이지 기록은 응답의 방문자 쿠키를 받아야 하므로 fetch(같은 출처, 쿠키 포함)로 보낸다
    if (kind === "page") {
      void fetch(url, { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
      return;
    }
    // sendBeacon 은 페이지를 떠나는 중에도 보내진다. text/plain 이라 미리보기(preflight) 요청이 없다
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
    void fetch(url, { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
  } catch {
    // 기록 실패는 무시한다
  }
}
