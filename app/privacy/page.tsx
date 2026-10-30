import type { Metadata } from "next";
import Link from "next/link";
import LegalDoc from "@/components/legal/LegalDoc";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "북한법률정보센터 개인정보 처리방침 — 수집 항목·목적·보유 기간·파기·국외 이전·정보주체 권리.",
  alternates: { canonical: "https://www.nk-law.kr/privacy" },
};

// T43 작성, T44 확정(2026-10-30 시행). 보관 기간 숫자는 백엔드 app/usage/repo.py(EVENT_RETENTION_DAYS 등)와 같아야 한다.
const SECTIONS = [
  { id: "purpose", title: "처리 목적" },
  { id: "items", title: "처리 항목과 수집 방법" },
  { id: "period", title: "보유·이용 기간" },
  { id: "destroy", title: "파기 절차·방법" },
  { id: "third", title: "제3자 제공" },
  { id: "entrust", title: "처리 위탁" },
  { id: "abroad", title: "국외 이전" },
  { id: "rights", title: "정보주체의 권리와 행사 방법" },
  { id: "child", title: "만 14세 미만 아동" },
  { id: "cookie", title: "자동 수집 장치(쿠키)" },
  { id: "safety", title: "안전성 확보 조치" },
  { id: "officer", title: "개인정보 보호책임자" },
  { id: "remedy", title: "권익침해 구제 방법" },
  { id: "change", title: "처리방침의 변경" },
];

export default function PrivacyPage() {
  return (
    <LegalDoc title="개인정보 처리방침" sections={SECTIONS}>
      <p>
        통일과 북한법학회(이하 &ldquo;학회&rdquo;)가 운영하는 북한법률정보센터(www.nk-law.kr, 이하 &ldquo;센터&rdquo;)는 「개인정보 보호법」에
        따라 이용자의 개인정보를 보호하고 관련 고충을 처리하기 위해 다음과 같이 처리방침을 둡니다.
        <strong> 센터의 모든 기능은 로그인 없이 쓸 수 있으며</strong>, 로그인(구글 계정)은 선택입니다.
      </p>

      <h2 id="purpose">1. 처리 목적</h2>
      <ul>
        <li>회원 식별과 로그인 상태 유지(필수)</li>
        <li>서비스 개선을 위한 이용 통계 — 로그인 상태의 이용 기록을 계정과 연결하는 것은 선택 동의한 회원만</li>
        <li>부정 이용 방지와 서비스 안정 운영</li>
      </ul>

      <h2 id="items">2. 처리 항목과 수집 방법</h2>
      <table>
        <thead>
          <tr><th>구분</th><th>항목</th><th>수집 방법</th></tr>
        </thead>
        <tbody>
          <tr><td>회원(필수)</td><td>구글 계정 고유번호, 이메일, 이름, 가입·마지막 로그인 일시, 동의 항목·문서 버전·일시</td><td>구글 로그인과 동의 화면(동의한 뒤에만 저장)</td></tr>
          <tr><td>회원(선택)</td><td>로그인 상태 이용 기록을 계정과 연결</td><td>&lsquo;이용 기록 분석&rsquo; 선택 동의 시</td></tr>
          <tr><td>모든 이용자</td><td>익명 이용 기록: 이용 종류(페이지·법령 조회·검색·신구비교·남북비교·용어·AI 상담 사용 여부), 대상(법령명·경로), 검색어, 일시</td><td>이용 시 자동 수집. IP 주소·브라우저 정보·기기 식별자는 저장하지 않음</td></tr>
        </tbody>
      </table>
      <p>AI 상담의 질문·답변 내용은 센터 서버에 저장하지 않습니다(이용 기록에는 &lsquo;사용 여부&rsquo;만 남습니다).</p>

      <h2 id="period">3. 보유·이용 기간</h2>
      <ul>
        <li>회원 정보·동의 기록: 회원 탈퇴 시까지. 단 <strong>1년간 로그인하지 않으면</strong> 파기합니다.</li>
        <li>익명 이용 기록: 수집일로부터 <strong>13개월</strong>(검색어는 <strong>90일</strong> 뒤 지움)</li>
        <li>로그인 대기 정보(동의 전): 서버에 저장하지 않고 브라우저 쿠키에 최대 15분</li>
      </ul>

      <h2 id="destroy">4. 파기 절차·방법</h2>
      <p>보유 기간이 지나거나 회원이 탈퇴하면 지체 없이 데이터베이스에서 삭제합니다(복구할 수 없는 방법). 기간 경과 기록은 매일 자동으로 파기합니다. 탈퇴 시 그동안의 이용 기록은 계정과의 연결만 끊어 익명 기록으로 남고, 위 익명 기록 보유 기간에 따라 파기됩니다.</p>

      <h2 id="third">5. 제3자 제공</h2>
      <p>개인정보를 제3자에게 제공하지 않습니다. 법령에 특별한 규정이 있는 경우는 예외입니다.</p>

      <h2 id="entrust">6. 처리 위탁</h2>
      <p>개인정보 처리를 위탁하지 않습니다(학회가 직접 운영). 로그인은 이용자가 구글(Google LLC)에 직접 인증하는 방식이며, 센터는 구글로부터 위 회원 항목만 받습니다.</p>

      <h2 id="abroad">7. 국외 이전</h2>
      <p>AI 상담을 쓰면 답변 생성을 위해 <strong>질문 내용</strong>이 다음 사업자의 AI 서비스로 전송됩니다. AI 상담을 쓰지 않으면 이전되지 않습니다.</p>
      <table>
        <thead>
          <tr><th>받는 자</th><th>국가</th><th>항목</th><th>시기·방법</th><th>보유 기간</th></tr>
        </thead>
        <tbody>
          <tr><td>Anthropic, PBC</td><td>미국</td><td>AI 상담 질문 내용</td><td>질문할 때 암호화 통신으로 전송</td><td>각 사업자 정책에 따름</td></tr>
          <tr><td>Google LLC(Gemini)</td><td>미국</td><td>AI 상담 질문 내용(대체 처리 시)</td><td>같음</td><td>같음</td></tr>
        </tbody>
      </table>
      <p>AI 상담 질문에는 개인정보를 넣지 마세요.</p>

      <h2 id="rights">8. 정보주체의 권리와 행사 방법</h2>
      <p>회원은 언제든지 개인정보 열람·정정·삭제·처리정지와 동의 철회를 요구할 수 있습니다. <Link href="/account">내 계정</Link>에서 정보 확인, 선택 동의 철회, 회원 탈퇴(즉시 삭제)를 직접 할 수 있고, 그 밖의 요구는 아래 보호책임자에게 연락하면 지체 없이 처리합니다.</p>

      <h2 id="child">9. 만 14세 미만 아동</h2>
      <p>만 14세 미만 아동의 회원 가입은 받지 않습니다(가입 시 만 14세 이상임을 확인). 로그인 없이 쓰는 기능에는 제한이 없습니다.</p>

      <h2 id="cookie">10. 자동 수집 장치(쿠키)</h2>
      <p>로그인 상태 유지를 위한 쿠키(nklaw_session, 30일)와 로그인 과정에서만 쓰는 임시 쿠키만 씁니다. 분석·광고·추적 쿠키는 쓰지 않습니다. 브라우저 설정으로 쿠키를 거부할 수 있으나 그러면 로그인이 되지 않습니다(다른 기능은 그대로). 브라우저의 GPC(Global Privacy Control) 신호를 켜면 익명 이용 기록도 보내지 않습니다.</p>

      <h2 id="safety">11. 안전성 확보 조치</h2>
      <ul>
        <li>개인정보 데이터베이스를 법령 데이터와 분리하고 전용 계정에 최소 권한만 부여</li>
        <li>전송 구간 암호화(HTTPS), 쿠키 서명·HttpOnly·Secure</li>
        <li>접속 정보·비밀값을 소스와 분리해 보관, 관리자 화면은 지정 계정만 접근(집계만 표시)</li>
      </ul>

      <h2 id="officer">12. 개인정보 보호책임자</h2>
      <p>학회는 개인정보 처리에 관한 업무를 총괄해 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리와 피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다. 개인정보 관련 문의·요구는 아래 이메일로 보내 주시면 지체 없이 답변·처리합니다.</p>
      <table>
        <tbody>
          <tr><th>직책</th><td>사이트 운영자</td></tr>
          <tr><th>이메일</th><td><a href="mailto:slpy8222@gmail.com">slpy8222@gmail.com</a></td></tr>
        </tbody>
      </table>

      <h2 id="remedy">13. 권익침해 구제 방법</h2>
      <ul>
        <li>개인정보침해신고센터: (국번 없이) 118, privacy.kisa.or.kr</li>
        <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
        <li>대검찰청: (국번 없이) 1301, 경찰청: (국번 없이) 182</li>
      </ul>

      <h2 id="change">14. 처리방침의 변경</h2>
      <p>이 처리방침은 시행일부터 적용하며, 내용이 바뀌면 시행 7일 전(중요한 변경은 30일 전) 센터에 공지합니다. 문서 버전이 바뀌면 회원에게 다음 로그인 때 다시 동의를 받습니다.</p>
      <p className="text-gray-500">시행일: 2026-10-30</p>
    </LegalDoc>
  );
}
