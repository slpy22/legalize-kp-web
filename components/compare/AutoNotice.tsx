/**
 * 남북 비교 화면 공통 고지(T57) — 매핑·조문 대응·용어는 생성 모델로 만든 자료이고 아직 검증 전이다(T49 진단).
 * 매핑의 신뢰도(high)·용어의 '검수 완료' 표시는 근거가 없어 화면에서 내렸다.
 */
export default function AutoNotice({ className = "" }: { className?: string }) {
  return (
    <p
      role="note"
      className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ${className}`}
    >
      <strong className="mr-1 font-semibold">자동 생성 — 검증 전</strong>
      이 비교는 자동으로 만든 자료이며 아직 검증되지 않았습니다. 남한 법령명·조문 대응이 틀릴 수 있으니 원문 조문을 확인하세요.
    </p>
  );
}

/** 국가법령정보센터 법령 바로가기(법령명 그대로) — 폐지·개명된 이름이면 그 사실이 바로 드러난다 */
export function lawGoKrUrl(name: string): string {
  return `https://www.law.go.kr/법령/${encodeURIComponent(name)}`;
}
