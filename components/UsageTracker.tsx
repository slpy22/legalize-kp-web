"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, type TrackKind } from "@/lib/track";

/** 페이지 이동마다 'page' 이용 기록(T43). 경로만 보내고 검색어 같은 주소의 쿼리는 넣지 않는다. */
export default function UsageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) track("page", { path: pathname });
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
