/**
 * 이용 기록 보내기(T43). 본문에 식별자(기기 정보 등)를 넣지 않는다 — 서버가 익명으로 센다.
 * 로그인 회원은 '이용 기록 분석'에 선택 동의한 경우에만 서버가 계정과 연결한다(세션 쿠키로 판단).
 * T52: 방문자 수는 서버가 주는 1st-party 방문자 쿠키(nklaw_vid, 무작위 ID)로 센다 — 페이지 기록은 그 쿠키를 받도록 fetch 로 보낸다.
 * 브라우저의 GPC(Global Privacy Control) 신호가 켜져 있으면 이용 기록을 보내지 않고, 페이지 이동 때 식별자 없는 '방문 신호'만
 * 보낸다(서버가 쿠키 없이 그날 해시로만 센다, 처리방침 10조). 실패해도 화면에 영향이 없다.
 * T89: 한 번의 방문 안의 열람 순서·페이지별 머문 시간 — 이 탭의 sessionStorage 에만 두는 무작위 임시 방문 ID(탭을 닫으면 사라짐)로
 * 기록을 묶는다. 방문자 쿠키·회원·IP 와 잇지 않는다. GPC 를 켰거나 쿠키를 막은 브라우저는 만들지 않는다.
 * T91: 유입 경로 — 방문(탭)의 첫 페이지 기록에만 직전 사이트의 호스트 이름(전체 주소가 아님)과 주소의 utm_source 값을 붙인다.
 * 서버가 바로 분류해 분류와 호스트 이름만 남긴다. 같은 사이트 안에서 온 것은 보내지 않는다. GPC 면 아무것도 보내지 않는다.
 * T107: 출처는 '그 문서를 새로 연 첫 페이지 기록'에 붙인다 — 탭의 첫 페이지(seq 1)만이 아니라, 같은 탭에서 바깥 링크로 다시 들어온
 * 경우(탭의 순번은 이어짐)에도 붙는다. 새로고침·뒤로/앞으로로 다시 연 문서와 사이트 안 이동에는 붙이지 않는다(isLanding).
 * T107: 사람 조작 없이 화면이 스스로 주소를 바꾼 페이지(예: 비교 대상 지정 주소 → 비교 화면)는 nav:"auto" 표지를 붙인다 —
 * 서버는 저장하지 않고 데이터센터 단발 방문 정산(규칙 3f)에서 '옮겨 간 페이지'로 세지 않는 데만 쓴다.
 * T107: 임시 방문 ID 는 탭을 VISIT_IDLE_MS(30분) 넘게 쓰지 않다가 문서를 새로 열면 새로 만든다 — 열어 둔(또는 복원한) 탭을
 * 다음 날 다시 쓰면 앞 방문의 순번이 이어져 새 방문의 첫 페이지·출처가 빠졌다(2026-11-05 01:02, 11-04 13:19 방문의 같은 탭).
 * 사이트 안 이동(같은 문서)에서는 바꾸지 않는다 — 한 페이지를 오래 읽고 옮겨 가도 같은 방문이다.
 * T114: 사이트 안 이동이라도 마지막 기록(페이지·머문 시간) 뒤 KST 날짜가 바뀌었거나 SITE_IDLE_MS(3시간) 넘게 쉬었으면 새 임시 방문 ID 로
 * 시작한다 — 11-04 18:02 방문의 탭을 열어 둔 채 11-05 12:57 사이트 안 링크를 눌러 순번 10 으로 이어져, 그날 방문 목록에 안 보였다.
 * 이때 첫 페이지에는 출처를 붙이지 않는다(문서를 연 때의 직전 사이트는 그날의 유입이 아니다). 한 페이지를 읽는 동안에는 탭을
 * 숨기거나 옮길 때 머문 시간 기록이 마지막 기록 시각을 새로 하므로, 긴 읽기(머문 시간 상한 1시간) 뒤 이동은 같은 방문이다.
 * 문서를 새로 열 때(30분)도 날짜가 바뀌었으면 새로 시작한다.
 * 'kind' 는 백엔드 app/usage/repo.py KINDS 와 같다.
 */
export type TrackKind = "page" | "law_view" | "search" | "diff" | "compare" | "terms" | "chat";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const TAB_KEY = "nklaw_tab";        // 임시 방문 ID
const SEQ_KEY = "nklaw_tab_seq";    // 이 탭 안의 페이지 순번
const AT_KEY = "nklaw_tab_at";      // 이 탭의 마지막 기록 시각(ms) — 방문을 새로 열지 가르는 데만
export const VISIT_IDLE_MS = 30 * 60 * 1000;
export const SITE_IDLE_MS = 3 * 60 * 60 * 1000;   // T114: 사이트 안 이동에서 새 방문으로 보는 쉼
export const DWELL_MAX = 3600;      // 한 페이지 머문 시간 상한(초) — 서버와 같다

let landingTaken = false;
let docStarted = false;
let quietVisit: string | null = null;   // T114: 사이트 안에서 새로 시작한 임시 방문 — 그 첫 페이지에 출처를 붙이지 않는다

/** KST 날짜(YYYY-MM-DD) — 방문을 새로 열지 가르는 데만 */
function kstDay(ms: number): string {
  return new Date(ms + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

function touch(now: number): void {
  try {
    sessionStorage.setItem(AT_KEY, String(now));
  } catch {
    // 저장소를 못 쓰면 그대로
  }
}

/**
 * T107: 이 문서(전체 로드)를 새로 연 뒤 첫 페이지 기록인가 — 문서마다 처음 한 번만 true.
 * 새로고침(reload)·뒤로/앞으로(back_forward)로 다시 연 문서는 새 유입이 아니라 false.
 */
export function isLanding(): boolean {
  if (typeof window === "undefined" || landingTaken) return false;
  landingTaken = true;
  try {
    const nav = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
    return !nav || nav.type === "navigate" || (nav.type as string) === "prerender";
  } catch {
    return true;
  }
}

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

/** 이 탭의 다음 페이지 순번(1부터). 임시 방문 ID 가 없으면 null.
 * T107: 문서의 첫 순번을 받을 때 탭이 VISIT_IDLE_MS 넘게 쉬었으면 임시 방문 ID·순번을 새로 시작한다.
 * T114: 사이트 안 이동이라도 KST 날짜가 바뀌었거나 SITE_IDLE_MS 넘게 쉬었으면 새로 시작한다(출처 없이). */
export function nextSeq(): number | null {
  if (!tabVisit()) return null;
  try {
    const now = Date.now();
    const at = parseInt(sessionStorage.getItem(AT_KEY) ?? "0", 10) || 0;
    const newDay = at > 0 && kstDay(at) !== kstDay(now);
    const first = !docStarted;
    docStarted = true;
    if (at && (newDay || now - at > (first ? VISIT_IDLE_MS : SITE_IDLE_MS))) {
      sessionStorage.removeItem(TAB_KEY);
      sessionStorage.removeItem(SEQ_KEY);
      const v = tabVisit();
      if (!v) return null;
      quietVisit = first ? null : v;
    }
    touch(now);
    const n = (parseInt(sessionStorage.getItem(SEQ_KEY) ?? "0", 10) || 0) + 1;
    if (n > 100_000) return null;
    sessionStorage.setItem(SEQ_KEY, String(n));
    return n;
  } catch {
    return null;
  }
}

/**
 * T91: 방문 첫 페이지의 출처 — { ref: 직전 사이트 호스트 이름(없으면 ""), utm?: utm_source }. 같은 사이트에서 왔으면 {}.
 * 전체 주소·경로·검색어·그 밖의 query 는 꺼내지 않는다.
 */
export function entrySource(): { ref?: string; utm?: string } {
  if (typeof window === "undefined") return {};
  try {
    let ref = "";
    if (document.referrer) {
      const h = new URL(document.referrer).hostname.toLowerCase();
      if (h && h === window.location.hostname.toLowerCase()) return {};   // 사이트 안 이동(새 탭 열기 등)은 기록하지 않는다
      ref = h.slice(0, 253);
    }
    const utm = (new URLSearchParams(window.location.search).get("utm_source") ?? "").trim().slice(0, 100);
    return { ref, ...(utm ? { utm } : {}) };
  } catch {
    return {};
  }
}

function beacon(url: string, body: string): void {
  // sendBeacon 은 페이지를 떠나는 중에도 보내진다. text/plain 이라 미리보기(preflight) 요청이 없다
  if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }))) return;
  void fetch(url, { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {});
}

export function track(
  kind: TrackKind,
  data: { law?: string; path?: string; query?: string; seq?: number; ref?: string; utm?: string; nav?: "auto" } = {},
): void {
  if (typeof window === "undefined") return;
  try {
    if (gpc()) {
      if (kind === "page") void fetch(`${API}/api/v1/usage/visit`, { method: "POST", keepalive: true, credentials: "omit" }).catch(() => {});
      return;
    }
    const visit = tabVisit();
    const { seq, ref, utm, nav, ...rest } = data;
    // T91·T107: 출처는 순번이 있는 페이지 기록에만(부르는 쪽이 문서를 새로 연 첫 기록에만 넘긴다)
    // T114: 사이트 안에서 새로 시작한 방문의 첫 페이지에는 붙이지 않는다
    const quiet = visit !== null && visit === quietVisit && seq === 1;
    const src = visit && seq && kind === "page" && ref !== undefined && !quiet ? { ref, ...(utm ? { utm } : {}) } : {};
    // T107: 화면 자체 이동 표지 — 두 번째 이후 페이지에만, 출처와 함께 쓰지 않는다
    const auto = visit && seq && seq >= 2 && kind === "page" && nav === "auto" && ref === undefined ? { nav } : {};
    const body = JSON.stringify({ kind, ...rest, ...(visit ? { visit, ...(seq ? { seq } : {}), ...src, ...auto } : {}) });
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

/** T116: 보이는 상태 누계가 이 초가 되면 머문 시간을 한 번 미리 보낸다(그 뒤는 지금처럼 숨기거나 떠날 때) */
export const EARLY_DWELL_SEC = 15;

export type DwellMeter = { show: () => void; hide: () => void; end: () => void };

/**
 * 한 페이지(seq)의 보이는 상태 시간 재기(T89) — 숨기면 멈추고 누계를 보낸다, 다시 보이면 이어 잰다, 페이지를 옮기면 마지막 누계를 보낸다.
 * T116: 보이는 상태 누계가 EARLY_DWELL_SEC 가 되면 한 번 미리 보낸다. 탭을 70분 넘게 보이는 채로 두면 숨김·떠남 신호가 늦어
 * 해외 회선의 출처 없는 한 페이지 방문(규칙 3j — 머문 시간 신호가 하나도 없으면 수집으로 정산)이 사람인데도 빠질 수 있었다.
 * 보내는 값은 원래 보내던 누계와 같은 것이고 서버는 큰 값만 남긴다 — 새로 모으는 정보는 없다.
 */
export function dwellMeter(seq: number, visible: boolean, clock: () => number = () => performance.now()): DwellMeter {
  let acc = 0;
  let since: number | null = visible ? clock() : null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let early = false;
  const total = () => acc + (since !== null ? clock() - since : 0);
  const flush = () => trackDwell(seq, Math.round(total() / 1000));
  const disarm = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const arm = () => {
    if (early || timer !== null || since === null) return;
    timer = setTimeout(() => {
      timer = null;
      if (early || since === null) return;
      if (total() >= EARLY_DWELL_SEC * 1000 - 50) {
        early = true;
        flush();
      } else {
        arm();                                     // 타이머가 일찍 깼다(시계 차이) — 남은 만큼 다시
      }
    }, Math.max(0, EARLY_DWELL_SEC * 1000 - total()));
  };
  arm();
  return {
    show() {
      if (since === null) {
        since = clock();
        arm();
      }
    },
    hide() {
      disarm();
      if (since !== null) {
        acc += clock() - since;
        since = null;
      }
      flush();
    },
    end() {
      disarm();
      flush();
    },
  };
}

/** T89: 이 탭의 seq 번째 페이지에 보이는 상태로 머문 시간(초, 누계). 서버는 큰 값만 남긴다. */
export function trackDwell(seq: number, sec: number): void {
  if (typeof window === "undefined" || sec <= 0) return;
  try {
    const visit = tabVisit();
    if (!visit) return;
    touch(Date.now());
    beacon(`${API}/api/v1/usage/dwell`, JSON.stringify({ visit, seq, sec: Math.min(DWELL_MAX, Math.round(sec)) }));
  } catch {
    // 기록 실패는 무시한다
  }
}
