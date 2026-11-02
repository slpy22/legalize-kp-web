"use client";

import { useEffect, useState } from "react";
import { adminOpDevice, setAdminOpDevice, type OpDevice as State } from "@/lib/account";

/**
 * T90: 이 브라우저 집계 제외(운영자 기기). 관리자로 로그인한 브라우저에 서명 쿠키를 두어, 로그아웃 뒤에도 이 브라우저의 접속은
 * 이용 기록·방문자 수·방문 경로에 넣지 않고 '내부 접속(운영자 기기)' 건수로만 센다. 끈 상태도 기억한다(다음 로그인 때 다시 켜지지 않음).
 */
export default function OpDevice() {
  const [st, setSt] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminOpDevice()
      .then((r) => (r.status === 200 ? setSt(r.data) : setError(r.data.error ?? "상태를 불러오지 못했습니다.")))
      .catch(() => setError("상태를 불러오지 못했습니다."));
  }, []);

  const toggle = async () => {
    if (!st) return;
    setBusy(true);
    try {
      const r = await setAdminOpDevice(!st.on);
      if (r.status === 200) {
        setSt(r.data);
        setError(null);
      } else setError(r.data.error ?? "바꾸지 못했습니다.");
    } catch {
      setError("바꾸지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm">
      <span className="font-medium text-gray-800">이 브라우저 집계 제외</span>
      {st ? (
        <>
          <span className={st.on ? "text-emerald-700" : "text-gray-500"}>
            <span aria-hidden className="mr-1">{st.on ? "●" : "○"}</span>
            {st.on ? "켜짐 — 이 브라우저 접속은 로그아웃 뒤에도 통계에서 뺍니다" : "꺼짐 — 로그아웃하면 일반 방문자처럼 셉니다"}
          </span>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {st.on ? "끄기" : "켜기"}
          </button>
          {st.auto && <span className="text-xs text-gray-400">(이 브라우저에서 처음 열어 켰습니다)</span>}
          <span className="text-xs text-gray-400">점검 헤더: {st.test_header ? "설정됨" : "설정 안 됨"}</span>
        </>
      ) : (
        !error && <span className="text-xs text-gray-400">불러오는 중…</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
