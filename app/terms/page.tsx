import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/components/legal/LegalDoc";

export const metadata: Metadata = {
  title: "이용약관",
  description: "북한법률정보센터 이용약관 — 서비스 내용, 회원 가입·탈퇴, 정보의 정확성, 저작권.",
  alternates: { canonical: "https://www.nk-law.kr/terms" },
};

const SECTIONS = [
  { id: "purpose", title: "목적" },
  { id: "service", title: "서비스 내용" },
  { id: "member", title: "회원 가입·탈퇴" },
  { id: "duty", title: "이용자의 의무" },
  { id: "accuracy", title: "정보의 정확성과 책임의 한계" },
  { id: "copyright", title: "저작권과 출처" },
  { id: "change", title: "서비스 변경·중단" },
  { id: "law", title: "준거법과 관할" },
];

export default function TermsPage() {
  return (
    <LegalDoc title="이용약관" sections={SECTIONS}>
      <h2 id="purpose">1. 목적</h2>
      <p>이 약관은 통일과 북한법학회(이하 &ldquo;학회&rdquo;)가 운영하는 북한법률정보센터(www.nk-law.kr, 이하 &ldquo;센터&rdquo;)의 이용 조건과 절차, 학회와 이용자의 권리·의무를 정합니다.</p>

      <h2 id="service">2. 서비스 내용</h2>
      <ul>
        <li>북한 법령 조문 검색·열람, 판본 신구비교와 AI 변화 리포트, 남북 법률 비교, 남북 법용어 대조, 북한법 AI 상담, 통계</li>
        <li>모든 기능은 무료이며 연구·교육 목적으로 제공합니다. <strong>로그인 없이도 모든 기능을 쓸 수 있습니다.</strong></li>
      </ul>

      <h2 id="member">3. 회원 가입·탈퇴</h2>
      <ul>
        <li>회원 가입은 선택이며 구글 계정으로 합니다. 만 14세 미만은 가입할 수 없습니다.</li>
        <li>가입 시 이 약관과 <Link href="/privacy">개인정보 처리방침</Link>의 필수 항목에 동의해야 합니다. &lsquo;이용 기록 분석&rsquo;은 선택이며 언제든 철회할 수 있습니다.</li>
        <li>회원은 언제든지 <Link href="/account">내 계정</Link>에서 탈퇴할 수 있으며, 탈퇴 즉시 회원 정보가 삭제됩니다.</li>
      </ul>

      <h2 id="duty">4. 이용자의 의무</h2>
      <ul>
        <li>센터의 정상 운영을 방해하는 행위(자동화된 대량 요청, 보안 우회 등)를 해서는 안 됩니다.</li>
        <li>AI 상담에 다른 사람의 개인정보나 민감한 정보를 입력하지 않아야 합니다.</li>
      </ul>

      <h2 id="accuracy">5. 정보의 정확성과 책임의 한계</h2>
      <ul>
        <li>센터의 법령 원문은 국가정보원 법령집, 통일부·법무부 자료 등 여러 출처에서 왔으며, 일부는 비정본(재입력·OCR) 자료입니다. 각 법령에 출처와 비정본 여부를 표시합니다.</li>
        <li>AI 상담과 AI 변화 리포트는 참고용이며 법률 자문이 아닙니다. 중요한 판단에는 원문 조항과 전문가 의견을 확인하세요.</li>
        <li>학회는 고의 또는 중대한 과실이 없는 한, 정보의 오류나 서비스 중단으로 생긴 손해에 책임을 지지 않습니다.</li>
      </ul>

      <h2 id="copyright">6. 저작권과 출처</h2>
      <p>법령 원문은 각 출처의 표시에 따릅니다. 센터가 만든 비교·분석 화면과 데이터 구성은 학회에 권리가 있으며, 연구·교육 목적으로 출처(북한법률정보센터)를 밝혀 인용할 수 있습니다.</p>

      <h2 id="change">7. 서비스 변경·중단</h2>
      <p>학회는 운영상·기술상 필요에 따라 서비스를 바꾸거나 중단할 수 있으며, 중요한 변경은 미리 공지합니다. 약관이 바뀌면 시행 7일 전(이용자에게 불리한 변경은 30일 전) 공지하고, 회원에게는 다음 로그인 때 다시 동의를 받습니다.</p>

      <h2 id="law">8. 준거법과 관할</h2>
      <p>이 약관은 대한민국 법에 따르며, 분쟁은 민사소송법에 따른 관할 법원에서 해결합니다.</p>
      <p className="text-gray-500">시행일: 2026-10-30</p>
    </LegalDoc>
  );
}
