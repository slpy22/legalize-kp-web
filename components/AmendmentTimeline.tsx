import Link from "next/link";
import type { Amendment } from "@/lib/types";
import ProvenanceBadges from "@/components/ProvenanceBadges";

interface Props {
  amendments: Amendment[];
  lawName?: string;
}

export default function AmendmentTimeline({ amendments, lawName }: Props) {
  return (
    <div className="relative ml-4">
      {/* 세로 라인 */}
      <div className="absolute left-0 top-0 h-full w-0.5 bg-navy-light/30" />

      <div className="space-y-6">
        {amendments.map((item) => {
          const isAdopted = item.action === "채택";
          return (
            <div key={item.id} className="relative pl-8">
              {/* 원형 마커 */}
              <div
                className={`absolute left-[-5px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                  isAdopted ? "bg-green-500" : "bg-navy-light"
                }`}
              />

              {/* 카드 */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    {item.date}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${
                      isAdopted ? "bg-green-500" : "bg-navy-light"
                    }`}
                  >
                    {item.action}
                  </span>
                  {item.has_text && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      본문 보유
                    </span>
                  )}
                  {/* T7: 본문 보유 판본의 출처 라벨·미검증 OCR 경고 */}
                  {item.has_text && <ProvenanceBadges p={item.provenance} size="xs" />}
                  {/* T7: 원문 미확보 개정(이력추가 주석) — 본문 없음, 외부 자료로만 확인 */}
                  {item.unverified && (
                    <span
                      className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700"
                      title="원문을 확보하지 못한 개정입니다. 외부 자료(학보 등)로만 확인됐습니다."
                    >
                      원문 미확보
                    </span>
                  )}
                  {item.effective_date && (
                    <span className="text-xs text-gray-500">시행 {item.effective_date}</span>
                  )}
                </div>
                {item.basis && (
                  <p className="mt-2 text-sm text-gray-600">{item.basis}</p>
                )}
                {item.unverified && (item.external_basis || item.note) && (
                  <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                    {item.external_basis && (
                      <p>
                        <span className="font-medium text-gray-700">외부근거</span> · {item.external_basis}
                      </p>
                    )}
                    {item.note && <p className="text-gray-500">{item.note}</p>}
                  </div>
                )}
                {item.has_text && lawName && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <Link
                      href={`/law/${encodeURIComponent(lawName)}?version=${item.date}`}
                      className="text-navy-light hover:underline"
                    >
                      이 시점 본문 보기 →
                    </Link>
                    <Link
                      href={`/diff?name=${encodeURIComponent(lawName)}`}
                      className="text-navy-light hover:underline"
                    >
                      신구대조
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
