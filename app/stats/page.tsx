import type { Metadata } from "next";
import Link from "next/link";
import { fetchCategories } from "@/lib/api";
import { getLawStats, type LawStats } from "@/lib/lawStats";
import YearlyChart from "@/components/stats/YearlyChart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "법령 통계",
  description: "북한 법령의 연도별 제정·개정·판본 건수와 분야별 법령 수.",
  alternates: { canonical: "https://www.nk-law.kr/stats" },
};

/** 2026-10-30 17:45 (KST) — 서버 Node 의 ICU 가 작아 toLocaleString("ko-KR") 이 'PM' 으로 나와 직접 만든다 */
function kst(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000);
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} (KST)`;
}

export default async function StatsPage() {
  // 연도별 통계는 법령마다 이력을 읽어 만들어 무겁다 — 서버에서 6시간 담아 둔다(lib/lawStats). 실패해도 분야 통계는 보인다.
  const [refR, statsR] = await Promise.allSettled([fetchCategories(), getLawStats()]);
  const ref = refR.status === "fulfilled" ? refR.value : null;
  const stats: LawStats | null = statsR.status === "fulfilled" ? statsR.value : null;
  const sorted = ref ? [...ref.categories].sort((a, b) => b.count - a.count) : [];
  const maxCount = sorted.length > 0 ? sorted[0].count : 1;

  const lastYear = stats?.rows.length ? stats.rows[stats.rows.length - 1].year : null;
  const recent5 = stats && lastYear ? stats.rows.filter((r) => r.year > lastYear - 5).reduce((n, r) => n + r.amended, 0) : null;
  const tiles = [
    { label: "총 법령", value: ref?.total_laws ?? stats?.totals.laws },
    { label: "개정 기록", value: stats?.totals.amended },
    { label: "본문 보유 판본", value: stats?.totals.versions },
    { label: lastYear ? `최근 5년 개정(${lastYear - 4}–${lastYear})` : "최근 5년 개정", value: recent5 ?? undefined },
  ].filter((t) => t.value != null);

  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">통계</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-gray-800">법령 통계</h1>

      {/* 요약 수치 */}
      <dl className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <dt className="text-xs text-gray-500">{t.label}</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-navy">{t.value!.toLocaleString()}</dd>
          </div>
        ))}
      </dl>

      {/* 연도별 제정·개정·판본 */}
      <h2 className="mb-3 text-lg font-bold text-gray-700">연도별 제정·개정</h2>
      {stats ? (
        <div className="mb-12 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <YearlyChart rows={stats.rows} />
          <p className="mt-3 text-xs text-gray-400">
            법령 목록의 제정일과 법령별 개정 이력(판본 날짜 포함)으로 셉니다. 원천에 기록이 없는 개정은 빠질 수 있습니다.
            {stats.historyFailed > 0 && ` 이력을 불러오지 못한 법령 ${stats.historyFailed}건은 개정·판본 수에서 빠졌습니다.`}
            {" "}집계 시각 {kst(stats.generatedAt)}.
          </p>
        </div>
      ) : (
        <p className="mb-12 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">연도별 통계를 지금 불러올 수 없습니다. 잠시 뒤 다시 열어 주세요.</p>
      )}

      {/* 분야별 법령 수(가로 막대) */}
      <h2 className="mb-4 text-lg font-bold text-gray-700">분야별 법령 수</h2>
      <div className="space-y-3">
        {sorted.map((cat) => {
          const pct = Math.round((cat.count / maxCount) * 100);
          return (
            <div key={cat.category}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <Link
                  href={`/category/${encodeURIComponent(cat.category)}`}
                  className="font-medium text-gray-700 hover:text-navy-light"
                >
                  {cat.category}
                </Link>
                <span className="text-gray-500">{cat.count}건</span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-navy-light transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
