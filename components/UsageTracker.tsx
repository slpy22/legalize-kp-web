"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { entrySource, nextSeq, track, trackDwell, type TrackKind } from "@/lib/track";

/**
 * 페이지 이동마다 'page' 이용 기록(T43). 경로만 보내고 검색어 같은 주소의 쿼리는 넣지 않는다.
 * T89: 이 탭 안의 페이지 순번을 함께 보내고, 그 페이지가 화면에 보이는 상태로 있던 시간만 재어(숨긴 탭 시간은 뺌)
 * 탭을 숨기거나·다른 페이지로 옮기거나·떠날 때 누계를 보낸다.
 * T91: 이 탭의 첫 페이지(순번 1)에만 출처(직전 사이트 호스트 이름·utm_source)를 붙인다 — 다음 페이지부터는 보내지 않는다.
 */
export default function UsageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const seq = nextSeq();
    track("page", { path: pathname, ...(seq ? { seq } : {}), ...(seq === 1 ? entrySource() : {}) });
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
