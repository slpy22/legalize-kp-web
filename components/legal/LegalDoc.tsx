import Link from "next/link";
import { DOC_VERSION } from "@/lib/account";

// T44: 사장님 확정(2026-10-30 시행). 바꾸면 DOC_VERSION 도 함께 바꿔 회원 동의를 다시 받는다
export const EFFECTIVE_DATE = "2026-10-30";

/** 처리방침·약관 공용 틀(T43·T44) — 시행일·버전, 목차 */
export default function LegalDoc({
  title,
  sections,
  children,
}: {
  title: string;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">홈</Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">{title}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">
        시행일 {EFFECTIVE_DATE} · 문서 버전 <code>{DOC_VERSION}</code>
      </p>
      <ol className="mt-6 grid gap-1 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 sm:grid-cols-2">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="hover:text-navy-light hover:underline">
              {i + 1}. {s.title}
            </a>
          </li>
        ))}
      </ol>
      <div className="prose prose-sm mt-8 max-w-none prose-headings:scroll-mt-20 prose-headings:text-navy prose-h2:mt-8 prose-h2:text-lg prose-table:text-sm">
        {children}
      </div>
    </section>
  );
}
