export default function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm">
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
        <p className="mt-1 text-xs text-white/40">
          &copy; {new Date().getFullYear()} 통일과 북한법학회 &mdash; 북한법률정보센터 운영 &middot; 연구 목적 제공
        </p>
      </div>
    </footer>
  );
}
