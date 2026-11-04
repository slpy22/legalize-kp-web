"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { entrySource, isLanding, nextSeq, track, trackDwell, type TrackKind } from "@/lib/track";

/** T107: 앞 페이지가 열린 뒤 이 시간 안에, 사람 조작(누름·키·터치·뒤로/앞으로) 없이 주소가 바뀌면 화면 자체 이동으로 본다 */
export const SELF_MOVE_MS = 5000;

/**
 * 페이지 이동마다 'page' 이용 기록(T43). 경로만 보내고 검색어 같은 주소의 쿼리는 넣지 않는다.
 * T89: 이 탭 안의 페이지 순번을 함께 보내고, 그 페이지가 화면에 보이는 상태로 있던 시간만 재어(숨긴 탭 시간은 뺌)
 * 탭을 숨기거나·다른 페이지로 옮기거나·떠날 때 누계를 보낸다.
 * T91: 이 탭의 첫 페이지(순번 1)에만 출처(직전 사이트 호스트 이름·utm_source)를 붙인다 — 다음 페이지부터는 보내지 않는다.
 * T107: 출처는 '이 문서를 새로 연 첫 페이지 기록'에 붙인다(같은 탭에서 AI 답 링크 등으로 다시 들어와 순번이 2 이상이어도).
 * 화면이 사람 조작 없이 SELF_MOVE_MS 안에 주소를 바꾼 페이지에는 nav:"auto" 를 붙인다.
 */
export default function UsageTracker() {
  const pathname = usePathname();
  const lastInput = useRef(0);               // 마지막 사람 조작 시각(performance.now)
  const prevStart = useRef<number | null>(null);  // 이 문서에서 앞 페이지 기록을 보낸 시각
  useEffect(() => {
    const mark = () => {
      lastInput.current = performance.now();
    };
    const opts = { capture: true, passive: true } as const;
    for (const t of ["pointerdown", "keydown", "touchstart"] as const) window.addEventListener(t, mark, opts);
    window.addEventListener("popstate", mark);
    return () => {
      for (const t of ["pointerdown", "keydown", "touchstart"] as const) window.removeEventListener(t, mark, opts);
      window.removeEventListener("popstate", mark);
    };
  }, []);
  useEffect(() => {
    if (!pathname) return;
    const seq = nextSeq();
    const now = performance.now();
    const prev = prevStart.current;
    prevStart.current = now;
    const landing = isLanding();
    const self = prev !== null && now - prev <= SELF_MOVE_MS && lastInput.current < prev;
    const extra = seq && (seq === 1 || landing) ? entrySource() : seq && self ? { nav: "auto" as const } : {};
    track("page", { path: pathname, ...(seq ? { seq } : {}), ...extra });
    if (!seq) return;
    let acc = 0;
    let since: number | null = document.visibilityState === "visible" ? performance.now() : null;
    const pause = () => {
      if (since !== null) {
        acc += performance.now() - since;
        since = null;
      }
    };
    const flush = () => trackDwell(seq, Math.round((acc + (since !== null ? performance.now() - since : 0)) / 1000));
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        pause();
        flush();
      } else if (since === null) {
        since = performance.now();
      }
    };
    const onPageHide = () => {
      pause();
      flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flush();
    };
  }, [pathname]);
  return null;
}

/** 서버 컴포넌트 페이지에서 한 번 기록할 때(예: 법령 조회) */
export function TrackOnMount({ kind, law, query }: { kind: TrackKind; law?: string; query?: string }) {
  useEffect(() => {
    track(kind, { law, query });
  }, [kind, law, query]);
  return null;
}
