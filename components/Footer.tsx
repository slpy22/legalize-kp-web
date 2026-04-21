export default function Footer() {
  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm">
        <p>
          데이터 출처: 국가정보원 북한법령정보센터 &middot; 통일법제
          데이터베이스
        </p>
        <p className="mt-1 text-xs text-white/40">
          &copy; {new Date().getFullYear()} 북한법정보센터 &mdash; 연구 목적 제공
        </p>
      </div>
    </footer>
  );
}
