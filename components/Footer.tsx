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
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm">
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
        <p className="mt-2">
          데이터 출처: 국가정보원 북한법률정보센터 &middot; 통일법제
          데이터베이스
        </p>
        {/* T43: 개인정보 처리방침은 눈에 띄게(굵게) — 개인정보보호법 제30조 공개 */}
        <p className="mt-2 text-xs">
          <Link href="/privacy" className="font-bold text-white/90 hover:underline">개인정보 처리방침</Link>
          <span className="mx-2 text-white/40">·</span>
          <Link href="/terms" className="text-white/70 hover:underline">이용약관</Link>
        </p>
        <p className="mt-1 text-xs text-white/40">
          &copy; {new Date().getFullYear()} 통일과 북한법학회 &mdash; 북한법률정보센터 운영 &middot; 연구 목적 제공
        </p>
      </div>
    </footer>
  );
}
