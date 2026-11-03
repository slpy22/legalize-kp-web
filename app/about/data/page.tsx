import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "데이터와 권리 안내",
  description:
    "북한법률정보센터 데이터가 어떻게 만들어지는지(수집·평문화·통합·개정 이력 추적)와 데이터베이스·편집저작물에 대한 권리, 이용 조건.",
  alternates: { canonical: "https://www.nk-law.kr/about/data" },
};

// T47: 데이터 권리 안내. 약관 6조(/terms#copyright)와 같은 내용을 자세히 풀어 쓴다.
const SECTIONS = [
  { id: "made", title: "데이터는 이렇게 만듭니다" },
  { id: "rights", title: "센터 데이터에 대한 권리" },
  { id: "excluded", title: "우리 권리에 들지 않는 것" },
  { id: "use", title: "이용 조건" },
  { id: "protect", title: "자동 수집 억제" },
  { id: "contact", title: "문의" },
];

const SOURCES = [
  { name: "국가정보원", desc: "「2024 북한법령집」 상·하권(정본 판단 기준)" },
  { name: "법무부", desc: "통일법제 데이터베이스 원문(HWP·PDF)" },
  { name: "통일부", desc: "북한 법령 자료" },
  { name: "NK TechLab", desc: "북한 「조선민주주의인민공화국 법전」 앱 화면을 옮긴 자료(미검증 표시)" },
  { name: "데일리NK", desc: "입수 원문 — 이용허락 범위 안에서만" },
];

export default function DataRightsPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link prefetch={false} href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">데이터와 권리 안내</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">데이터와 권리 안내</h1>
      <p className="mt-2 text-sm text-gray-600">
        북한법률정보센터의 법령 데이터·비교 자료는 통일과 북한법학회가 오랜 수집과 정리로 만든 결과물입니다. 어떻게 만들어지는지,
        어떤 권리가 있는지, 어떻게 쓰시면 되는지 안내합니다.
      </p>
      <ol className="mt-6 grid gap-1 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 sm:grid-cols-2">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="hover:text-navy-light hover:underline">{i + 1}. {s.title}</a>
          </li>
        ))}
      </ol>

      <div className="prose prose-sm mt-8 max-w-none prose-headings:scroll-mt-20 prose-headings:text-navy prose-h2:mt-8 prose-h2:text-lg prose-table:text-sm">
        <h2 id="made">1. 데이터는 이렇게 만듭니다</h2>
        <ol>
          <li><strong>출처별 원문 수집</strong> — 여러 기관·자료에 흩어진 북한 법령 원문을 모읍니다.</li>
        </ol>
        <table id="sources" className="scroll-mt-20">
          <thead><tr><th>출처</th><th>내용</th></tr></thead>
          <tbody>{SOURCES.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.desc}</td></tr>)}</tbody>
        </table>
        {/* T50: 바닥글에 적던 출처 나열을 여기로 옮겼다. 출처 표기는 법령 화면의 판본마다 한다(데일리NK 이용허락 조건 포함) */}
        <p className="text-sm">
          <strong>출처 표시</strong> — 각 법령 화면에는 판본마다 그 출처를 표시합니다(예: 법무부 통일법제 데이터베이스, 국가정보원 「2024 북한법령집」,
          데일리NK 재입력본은 &lsquo;출처: 데일리NK&rsquo;와 기사 링크). 예전 바닥글에 적던 &lsquo;국가정보원 북한법률정보센터 · 통일법제 데이터베이스&rsquo;는
          위 표의 국가정보원·법무부 항목에 해당합니다.
        </p>
        <ol start={2}>
          <li><strong>평문화</strong> — PDF·한글(HWP)·화면 이미지로 된 원문을 하나의 통일된 텍스트 형식으로 옮기고, 조문·장·절 구조를 갖춥니다. 출처마다 다른 표기·띄어쓰기를 맞추고, 비정본(재입력·OCR) 자료는 따로 표시합니다.</li>
          <li><strong>통합</strong> — 출처마다 흩어진 같은 법령의 여러 판본을 한 법령 아래 판본별로 모읍니다. 제한적으로만 공개된 최신 법령도 찾아 넣습니다.</li>
          <li><strong>개정 이력 추적</strong> — 공식 공개 자료에 없는 개정은 로동신문 등 북한 매체와 김일성종합대학 학보 등 북한 법학 논문을 분석해 찾아내고, 근거와 함께 기록합니다. 법령의 개정이력 화면에서 공식 이력과 구분해 <strong>센터 추적</strong>으로 표시합니다.</li>
          <li><strong>비교 자료</strong> — 북한 법령마다 대응하는 남한 법령을 짝짓고(남북 법령 매핑), 남북 법률 용어를 대조합니다.</li>
          <li><strong>지속 갱신</strong> — 새 판본·개정 소식이 확인되면 계속 고쳐 넣습니다.</li>
        </ol>

        <h2 id="rights">2. 센터 데이터에 대한 권리</h2>
        <p>위와 같이 상당한 투자와 노력으로 만든 다음 결과물은 통일과 북한법학회에 권리가 있습니다.</p>
        <ul>
          <li><strong>데이터베이스</strong>: 수집·평문화·통합·구조화한 법령 데이터베이스는 저작권법 제93조의 <strong>데이터베이스제작자의 권리</strong>로 보호됩니다. 그 전부 또는 상당한 부분을 복제·배포·전송하는 것은 허락 없이 할 수 없습니다.</li>
          <li><strong>편집저작물</strong>: 남북 법령 매핑, 남북 법률 용어 대조표, 개정 이력 정리처럼 소재를 선택·배열·구성한 결과물은 저작권법 제6조의 <strong>편집저작물</strong>입니다.</li>
          <li><strong>성과물</strong>: 위 결과물은 부정경쟁방지 및 영업비밀보호에 관한 법률 제2조 제1호가 정한 <strong>타인의 상당한 투자나 노력으로 만들어진 성과</strong>에 해당하며, 이를 무단으로 가져다 쓰는 것은 부정경쟁행위가 될 수 있습니다.</li>
          <li>사이트의 화면 구성, 비교·분석 기능과 설명 글도 학회에 권리가 있습니다.</li>
        </ul>

        <h2 id="excluded">3. 우리 권리에 들지 않는 것</h2>
        <ul>
          <li><strong>법령 원문 자체</strong>: 북한 법령의 조문 내용 그 자체에는 학회가 권리를 주장하지 않습니다(학회의 권리는 수집·정리·구성한 결과물에 있습니다).</li>
          <li><strong>출처 기관의 권리</strong>: 국가정보원·법무부·통일부 등 각 출처가 가진 자료의 권리는 그 기관에 있으며, 각 법령에 출처를 표시합니다.</li>
          <li><strong>데일리NK 자료</strong>: 데일리NK가 입수·제공한 원문은 데일리NK의 이용허락 범위 안에서만 쓰며, 그 권리는 데일리NK에 있습니다. 이 자료를 다시 쓰려면 데일리NK의 허락이 필요합니다.</li>
        </ul>

        <h2 id="use">4. 이용 조건</h2>
        <table>
          <thead><tr><th>이용</th><th>조건</th></tr></thead>
          <tbody>
            <tr><td>연구·교육 목적의 인용</td><td><strong>허용</strong> — 출처를 밝혀 주세요. 예) 북한법률정보센터(www.nk-law.kr), 통일과 북한법학회</td></tr>
            <tr><td>화면 열람, 개별 조문·결과의 인용</td><td>허용(출처 표시)</td></tr>
            <tr><td>자동 수집(크롤링·스크래핑·API 반복 호출, AI 학습용 수집 포함)</td><td><strong>금지</strong> — 회원이라도 허용하지 않습니다</td></tr>
            <tr><td>데이터의 상당 부분 복제·재구성·재배포</td><td><strong>금지</strong></td></tr>
            <tr><td>상업적 이용</td><td>사전 <strong>협의</strong>가 필요합니다</td></tr>
          </tbody>
        </table>
        <p>검색엔진(구글·네이버 등)이 공개 화면을 색인하는 것은 허용합니다. 자세한 조건은 <Link prefetch={false} href="/terms#copyright">이용약관 제6조</Link>에 따릅니다.</p>

        <h2 id="protect">5. 자동 수집 억제</h2>
        <p>
          데이터를 보호하기 위해 짧은 시간에 많은 요청을 보내거나 법령을 차례로 훑는 접근, 자동 수집 도구로 보이는 접근은 기술적으로 제한합니다.
          이 제한으로 정상적인 이용이 막혔다면 아래로 알려 주세요.
        </p>

        <h2 id="contact">6. 문의</h2>
        <p>상업적 이용 협의, 대량 이용이 필요한 연구 협력, 권리 관련 문의: 사이트 운영자 <a href="mailto:slpy8222@gmail.com">slpy8222@gmail.com</a></p>
      </div>
    </section>
  );
}
