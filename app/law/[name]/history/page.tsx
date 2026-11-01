import Link from "next/link";
import { fetchHistory } from "@/lib/api";
import AmendmentTimeline from "@/components/AmendmentTimeline";
import CenterTrackedList, { officialDate, trackedAnchor } from "@/components/CenterTrackedList";
import UnavailableNotice from "@/components/UnavailableNotice";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const history = await fetchHistory(name);
  // T47: 센터 추적 이력 — 타임라인의 같은 일자 행에 '센터 추적 근거' 배지로 잇는다
  const tracked = history.center_tracked ?? [];
  const trackedByDate: Record<string, string> = {};
  tracked.forEach((t, i) => {
    trackedByDate[t.date] ??= trackedAnchor(t, i);
    const od = officialDate(t); // 날짜이견: 공식 원문 일자 행에도
    if (od) trackedByDate[od] ??= trackedAnchor(t, i);
  });

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/law/${encodeURIComponent(name)}`}
          className="hover:text-navy-light"
        >
          {name}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">개정이력</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-800">개정이력</h1>
      <p className="mb-2 text-sm text-gray-500">
        {history.law_name} &mdash; 공식 공개 이력 {history.amendments.length}건
        {tracked.length > 0 && <> · 센터 추적 {tracked.length}건</>}
      </p>
      <p className="mb-8 text-xs text-gray-400">
        공식 공개 이력은 국정원·법무부·통일부 등 출처 자료에 실린 이력이고, <span className="font-medium text-violet-700">센터 추적</span>은
        센터가 북한 매체·논문으로 따로 찾아낸 이력입니다(아래 목록, 근거 포함).
      </p>

      {history.text && <UnavailableNotice text={history.text} lawName={name} compact />}
      <AmendmentTimeline amendments={history.amendments} lawName={name} trackedByDate={trackedByDate} />

      <CenterTrackedList items={tracked} />
    </section>
  );
}
