import Link from "next/link";

// T42: 주요 기능 바로가기(내부 링크)
const LINKS = [
  { href: "/search", label: "법령 찾기" },
  { href: "/diff", label: "신구비교" },
  { href: "/compare", label: "남북비교" },
  { href: "/compare/terms", label: "용어비교" },
  { href: "/stats", label: "통계" },
];

export default function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      {/* T51: 모바일은 떠 있는 챗봇 버튼(56px, 아래에서 약 34px)에 가리지 않게 아래 여백을 버튼만큼 더 둔다 */}
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-center text-sm lg:pb-6">
        <nav aria-label="바닥글 메뉴" className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-white/80">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="font-medium text-white/90">
          <a
            href="https://www.nkls.or.kr/index.ink"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            통일과 북한법학회
          </a>{" "}
          &middot; 북한법률정보센터
        </p>
        {/* T43: 개인정보 처리방침은 눈에 띄게(굵게) — 개인정보보호법 제30조 공개 */}
        {/* T51: 한 줄을 넘으면 줄바꿈(예전에는 '권리 안…'에서 잘려 보였다). 링크마다 통째로 넘긴다 */}
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
          <Link href="/privacy" className="whitespace-nowrap font-bold text-white/90 hover:underline">개인정보 처리방침</Link>
          <span aria-hidden className="text-white/40">·</span>
          <Link href="/terms" className="whitespace-nowrap text-white/70 hover:underline">이용약관</Link>
          <span aria-hidden className="text-white/40">·</span>
          {/* T50: 바닥글의 '데이터 출처: …' 나열은 /about/data 의 출처 표로 옮겼다 */}
          <Link href="/about/data#sources" className="whitespace-nowrap text-white/70 hover:underline">데이터 출처·권리 안내</Link>
        </p>
        <p className="mt-1 text-xs text-white/40">
          &copy; {new Date().getFullYear()} 통일과 북한법학회 &mdash; 북한법률정보센터 운영 &middot; 연구 목적 제공
        </p>
      </div>
    </footer>
  );
}
