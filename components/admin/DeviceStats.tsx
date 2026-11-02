import type { AdminVisitors } from "@/lib/account";

/**
 * T88: 접속 단말 종류 — 관리자 이용현황. 요청의 브라우저 정보에서 바로 판정한 종류 이름만 저장한다(브라우저 정보 원문은 저장하지 않음).
 * 방문자는 그날 첫 요청의 단말(일별 합), 조회는 페이지·법령 조회 건수. 단말 기록을 시작하기 전 기록은 '기록 전'.
 */
const LABEL: Record<string, string> = {
  mobile: "모바일(휴대전화)", tablet: "태블릿", pc: "PC(데스크톱·노트북)", unknown: "알 수 없음", none: "기록 전",
};

export default function DeviceStats({ v, days }: { v: AdminVisitors; days: number }) {
  const rows = v.devices ?? [];
  const known = rows.filter((r) => r.device !== "none");
  const total = known.reduce((n, r) => n + r.visitors, 0);
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-800">접속 단말({days}일)</h2>
      <table className="mt-3 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm lg:w-1/2">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">단말</th>
            <th className="whitespace-nowrap px-4 py-2 text-right">방문자(일별 합)</th>
            <th className="whitespace-nowrap px-4 py-2 text-right">비율</th>
            <th className="whitespace-nowrap px-4 py-2 text-right">페이지·법령 조회</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</td></tr>}
          {rows.map((r) => (
            <tr key={r.device} className={`border-t border-gray-100 ${r.device === "none" ? "text-gray-400" : ""}`}>
              <td className="px-4 py-2">{LABEL[r.device] ?? r.device}</td>
              <td className="px-4 py-2 text-right tabular-nums">{r.visitors.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {r.device === "none" || total === 0 ? "—" : `${Math.round((r.visitors / total) * 100)}%`}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{r.views.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-400">
        브라우저가 알려 주는 단말 정보로 나눕니다. 비율은 &lsquo;기록 전&rsquo;을 뺀 방문자 기준입니다.
        아이패드의 기본 사파리는 PC 로 자신을 알려 PC 로 셉니다.
      </p>
    </div>
  );
}
