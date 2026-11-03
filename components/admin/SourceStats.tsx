import type { AdminVisitors, SourceKind } from "@/lib/account";

/**
 * T91: 유입 경로 — 방문(탭)의 첫 페이지에서 직전 사이트의 호스트 이름과 링크의 utm_source 로 서버가 바로 분류한 결과.
 * 분류 이름과 호스트 이름만 저장한다(전체 주소·경로·검색어 없음). 사이트 안 이동은 세지 않는다.
 */
const ORDER: SourceKind[] = ["ai", "search", "social", "other", "direct"];
const COLOR: Record<SourceKind, string> = {
  ai: "bg-violet-50 text-violet-800",
  search: "bg-blue-50 text-blue-800",
  social: "bg-amber-50 text-amber-800",
  other: "bg-gray-100 text-gray-700",
  direct: "bg-emerald-50 text-emerald-800",
};

export default function SourceStats({ v, days }: { v: AdminVisitors; days: number }) {
  const s = v.sources;
  if (!s) return null;
  const by = new Map(s.by.map((x) => [x.src, x]));
  const total = s.by.reduce((n, x) => n + x.visits, 0);
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-gray-800">유입 경로({days}일)</h2>
      {!s.ready ? (
        <p className="mt-3 text-sm text-gray-500">유입 경로를 아직 모으지 않습니다(저장소 준비 전).</p>
      ) : (
        <div className="mt-3 grid gap-5 lg:grid-cols-2">
          <table className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">출처</th>
                <th className="whitespace-nowrap px-4 py-2 text-right">방문</th>
                <th className="whitespace-nowrap px-4 py-2 text-right">비율</th>
              </tr>
            </thead>
            <tbody>
              {ORDER.map((k) => {
                const x = by.get(k);
                const n = x?.visits ?? 0;
                return (
                  <tr key={k} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <span className={`rounded px-1.5 py-0.5 text-[12px] ${COLOR[k]}`}>{x?.label ?? k}</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{n.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{total ? `${Math.round((n / total) * 100)}%` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <table className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">출처 사이트</th>
                <th className="whitespace-nowrap px-4 py-2 text-right">방문</th>
              </tr>
            </thead>
            <tbody>
              {s.hosts.length === 0 && <tr><td colSpan={2} className="px-4 py-3 text-gray-400">아직 기록이 없습니다.</td></tr>}
              {s.hosts.slice(0, 20).map((h) => (
                <tr key={`${h.src}-${h.host}`} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <span className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] ${COLOR[h.src]}`}>{by.get(h.src)?.label ?? h.src}</span>
                    {h.host}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{h.visits.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">
        방문(브라우저 탭)의 첫 페이지 기준입니다. 직전 사이트의 호스트 이름과 링크의 출처 표시(utm_source)로 나누고, 전체 주소·검색어는 남기지 않습니다.
        &lsquo;유입 정보 없음&rsquo;은 직전 사이트를 알 수 없는 방문입니다 — 주소 입력·즐겨찾기뿐 아니라 앱 안 브라우저·메신저 링크·AI 답변 앱도 출처를 보내지 않아 여기에 들어갑니다. 데이터센터에서 온 단발 방문·앱 미리보기 렌더러는 사람 통계에서 뺍니다. 개인정보 보호 신호(GPC)·쿠키 차단·회원 연결 기록과 사이트 안 이동은 세지 않습니다.
      </p>
    </div>
  );
}
