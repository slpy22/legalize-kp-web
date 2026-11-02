import LawMissNotice from "@/components/LawMissNotice";

/**
 * T77: 없는 법령·없는 판본 일자 주소의 안내(HTTP 404 · noindex — page·history 가 notFound() 를 부른다).
 * Next 는 이 화면을 정상 화면에서도 미리 그려 둔다 — 그래서 여기서는 데이터를 불러오지 않고,
 * 판본 목록은 LawMissNotice 가 실제로 보일 때(브라우저) 불러온다(정상 화면의 HTML·API 호출을 늘리지 않음).
 */
export default function LawNotFound() {
  return <LawMissNotice />;
}
