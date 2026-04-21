import type { Amendment } from "@/lib/types";

interface Props {
  amendments: Amendment[];
}

export default function AmendmentTimeline({ amendments }: Props) {
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
                <div className="flex items-center gap-3">
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
                </div>
                {item.basis && (
                  <p className="mt-2 text-sm text-gray-600">{item.basis}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
