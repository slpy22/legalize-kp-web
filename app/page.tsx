import type { Metadata } from "next";
import Link from "next/link";
import { fetchCategories, fetchMappings, fetchCompareTerms, fetchLawList } from "@/lib/api";
import SearchBar from "@/components/SearchBar";
import AskExamples from "@/components/home/AskExamples";
import { recentAmendments } from "@/lib/lawStats";
import { getPopularLaws } from "@/lib/popular";
import {
  AI_EXAMPLES,
  AUDIENCES,
  COMPARE_SHOWCASE,
  TERM_SHOWCASE,
  diffHref,
  homeDiffShowcase,
} from "@/lib/showcase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "https://www.nk-law.kr" },
  openGraph: { url: "https://www.nk-law.kr" },
};

const SITE = "https://www.nk-law.kr";

/** 강점 바로가기(히어로 칩·구조화 데이터 공용) */
const STRENGTHS = [
  { id: "diff", label: "신구비교", href: "/diff", desc: "두 판본을 의미로 짝지어 신설·삭제·변경을 찾고 AI 변화 리포트를 씁니다" },
  { id: "ai", label: "AI 상담", href: "/chat", desc: "북한 법령을 말로 물으면 근거 조문과 함께 답합니다" },
  { id: "compare", label: "남북 법률 비교", href: "/compare", desc: "북한법에 대응하는 남한법과 겹치는 영역·고유 규정·조문 대응을 보여 줍니다" },
  { id: "terms", label: "법용어 비교", href: "/compare/terms", desc: "북한 법률 용어를 남한 용어와 짝지어 보여 줍니다" },
];

const KIND_STYLE = {
  added: { mark: "＋", label: "text-emerald-700", box: "border-emerald-200 bg-emerald-50" },
  removed: { mark: "－", label: "text-rose-700", box: "border-rose-200 bg-rose-50" },
  modified: { mark: "±", label: "text-amber-700", box: "border-amber-200 bg-amber-50" },
} as const;

export default async function Home() {
  // 실시간 수치(T42). 하나가 실패해도 홈은 뜨고 그 숫자만 숨긴다.
  const [refR, mapR, termR, listR] = await Promise.allSettled([
    fetchCategories(),
    fetchMappings(undefined, 1, 1),
    fetchCompareTerms(undefined, undefined, 1, 1),
    fetchLawList(),
  ]);
  const popular = await getPopularLaws();
  const ref = refR.status === "fulfilled" ? refR.value : null;
  // 주요 최근 개정 — 판본 날짜 기준(목록의 최신 판본일)
  const recent = listR.status === "fulfilled" ? recentAmendments(listR.value.laws, 8) : [];
  const categories = ref ? [...ref.categories].sort((a, b) => b.count - a.count) : [];
  const stats = [
    { label: "북한 법령", value: ref?.total_laws },
    { label: "남북 법령 매핑", value: mapR.status === "fulfilled" ? mapR.value.meta.total : undefined },
    { label: "법용어 대조", value: termR.status === "fulfilled" ? termR.value.meta.total : undefined },
  ].filter((s) => s.value);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "북한법률정보센터",
        url: SITE,
        description:
          "통일과 북한법학회가 운영하는 북한법률정보센터. 북한 법령 조문 검색, 판본 신구비교·AI 변화 리포트, 남북 법률 비교, 법용어 대조, AI 법률 상담.",
        publisher: { "@id": `${SITE}/#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE}/search?q={search_term_string}&mode=hybrid`,
          "query-input": "required name=search_term_string",
        },
        inLanguage: "ko",
      },
      {
        "@type": "Organization",
        "@id": `${SITE}/#org`,
        name: "통일과 북한법학회",
        url: "https://www.nkls.or.kr/index.ink",
        logo: `${SITE}/icon.png`,
      },
      {
        "@type": "ItemList",
        name: "북한법률정보센터 주요 기능",
        itemListElement: STRENGTHS.map((s, i) => ({
          "@type": "SiteNavigationElement",
          position: i + 1,
          name: s.label,
          description: s.desc,
          url: `${SITE}${s.href}`,
        })),
      },
    ],
  };

  const d = homeDiffShowcase();
  const c = COMPARE_SHOWCASE;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* 히어로: 가치 제안 + 실시간 수치 + 검색 + 강점 바로가기 */}
      <section className="bg-gradient-to-b from-navy to-navy-light px-4 pb-10 pt-10 text-white sm:pb-14 sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-medium tracking-wide text-white/70 sm:text-sm">통일과 북한법학회 운영 · 북한법률정보센터</p>
          <h1 className="text-[1.6rem] font-bold leading-snug tracking-tight sm:text-4xl sm:leading-tight">
            북한 법령을 찾고, <span className="whitespace-nowrap">바뀐 곳을 비교하고,</span>
            <br className="hidden sm:block" /> 남한법과 견주고, <span className="whitespace-nowrap">AI 에게 물어보세요</span>
          </h1>
          {stats.length > 0 && (
            <dl className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-white/80">
              {stats.map((s) => (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <dt>{s.label}</dt>
                  <dd className="text-lg font-bold text-white">{s.value!.toLocaleString()}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mx-auto mt-6 max-w-2xl text-left">
            <SearchBar size="large" />
          </div>
          <nav aria-label="주요 기능 바로가기" className="mt-6 flex flex-wrap justify-center gap-2">
            {STRENGTHS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* 강점 4가지 — 실제 결과 미리보기 */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <h2 className="mb-1 text-xl font-bold text-gray-900 sm:text-2xl">북한법률정보센터의 네 가지 강점</h2>
        <p className="mb-6 text-sm text-gray-500">아래는 실제 데이터에서 뽑은 결과입니다. 눌러서 바로 확인하세요.</p>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* ① 신구비교 */}
          <article id="diff" className="scroll-mt-20 flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-navy-light">① 신구비교 · 판본 의미 비교 · AI 변화 리포트</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">
              {d.shortName} {d.date1.replaceAll("-", ".")} → {d.date2.replaceAll("-", ".")}
            </h3>
            <p className="mt-1 text-sm text-gray-500">조문 번호가 밀려도 내용으로 짝지어, 무엇이 새로 생기고 사라지고 바뀌었는지 찾습니다.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">변경 {d.summary.modified}</span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">신설 {d.summary.added}</span>
              <span className="rounded-md bg-rose-100 px-2 py-0.5 text-rose-800">삭제 {d.summary.removed}</span>
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">동일 {d.summary.same}</span>
            </div>
            <ul className="mt-4 space-y-2">
              {d.excerpts.slice(0, 2).map((e) => {
                const st = KIND_STYLE[e.kind];
                return (
                  <li key={e.label} className={`rounded-lg border px-3 py-2 text-sm leading-relaxed ${st.box}`}>
                    <span className={`mr-1.5 font-semibold ${st.label}`}>
                      {st.mark} {e.label}
                    </span>
                    {e.before ? (
                      <>
                        <span className="text-gray-500 line-through decoration-gray-400">{e.before}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="text-gray-800">{e.text}</span>
                      </>
                    ) : (
                      <span className="text-gray-800">{e.text}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <Link href={diffHref(d.lawName, d.date1, d.date2)} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light">
                이 비교 결과 보기
              </Link>
              <Link href="/diff" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-navy-light hover:text-navy-light">
                다른 법령 비교
              </Link>
            </div>
          </article>

          {/* ② AI 상담 */}
          <article id="ai" className="scroll-mt-20 flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-navy-light">② AI 상담 · 북한법 전문 에이전트</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">말로 묻고, 근거 조문과 함께 답 받기</h3>
            <p className="mt-1 text-sm text-gray-500">
              법령 검색·판본 비교·남북 비교 도구를 직접 써서 답하고, 답 속 조문은 눌러서 원문으로 갑니다.
            </p>
            <div className="mt-4">
              <AskExamples questions={AI_EXAMPLES} />
            </div>
            <p className="mt-auto pt-4 text-xs text-gray-400">예시를 누르면 오른쪽 상담창이 열리며 바로 질문합니다. AI 답변은 참고용이며 원문 조항을 확인하세요.</p>
          </article>

          {/* ③ 남북 법률 비교 */}
          <article id="compare" className="scroll-mt-20 flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-navy-light">③ 남북 법률 비교 · 법령 매핑 · 조문 대응 · 체계 비교</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">
              북한 {c.kpName} ↔ 남한 {c.krName}
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 align-middle text-xs font-semibold text-yellow-700">{c.relationship}</span>
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div>
                <dt className="text-xs font-semibold text-gray-500">겹치는 영역</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {c.overlap.map((o) => (
                    <span key={o} className="rounded-full bg-navy-light/10 px-2.5 py-0.5 text-xs text-navy">{o}</span>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">북한 고유 규정</dt>
                <dd className="mt-0.5 text-gray-800">{c.kpUnique}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-gray-500">조문 대응</dt>
                <dd className="mt-0.5 text-gray-800">
                  북한 {c.kpName} {c.articleMap.kp} <span className="text-navy-light">↔</span> {c.articleMap.kr}
                </dd>
              </div>
            </dl>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              <Link href={`/compare/${encodeURIComponent(c.kpName)}`} className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light">
                {c.kpName} 비교 보기
              </Link>
              <Link href="/compare" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-navy-light hover:text-navy-light">
                매핑 {stats.find((s) => s.label === "남북 법령 매핑")?.value ?? ""}건 보기
              </Link>
            </div>
          </article>

          {/* ④ 법용어 비교 */}
          <article id="terms" className="scroll-mt-20 flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold text-navy-light">④ 법용어 비교 · 남북 용어 대조표</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">같은 제도, 다른 말</h3>
            <p className="mt-1 text-sm text-gray-500">북한 법률 용어를 남한 용어와 짝지었습니다. 눌러서 관련 용어를 찾아보세요.</p>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TERM_SHOWCASE.map((t) => (
                <li key={t.kp}>
                  <Link
                    href={`/compare/terms?q=${encodeURIComponent(t.kp)}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors hover:border-navy-light hover:bg-navy-light/5"
                  >
                    <span className="font-semibold text-gray-900">{t.kp}</span>
                    <span aria-hidden className="mx-2 text-gray-300">→</span>
                    <span className="text-navy-light">{t.kr}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-5">
              <Link href="/compare/terms" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-navy-light hover:text-navy-light">
                용어 {stats.find((s) => s.label === "법용어 대조")?.value ?? ""}개 모두 보기
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 자주 찾는 법령 · 주요 최근 개정 */}
      <section className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">이용자가 자주 찾는 법령</h2>
            <span className="text-xs text-gray-400">
              {popular.source === "usage" ? "최근 30일 조회 기준(익명 집계)" : "이용 통계 집계 전까지 대표 법령을 보여 줍니다"}
            </span>
          </div>
          <ol>
            {popular.laws.map((l, i) => (
              <li key={l.name} className="border-b border-gray-100 last:border-0">
                <Link href={`/law/${encodeURIComponent(l.name)}`} className="flex items-center gap-3 py-2 text-sm hover:text-navy-light">
                  <span className="w-5 shrink-0 text-right font-semibold text-navy-light">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-800">{l.name}</span>
                  {l.note && <span className="shrink-0 text-xs text-gray-400">{l.note}</span>}
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">주요 최근 개정</h2>
            <span className="text-xs text-gray-400">보유 판본의 최신 날짜 기준</span>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">최근 개정 목록을 불러올 수 없습니다.</p>
          ) : (
            <ul>
              {recent.map((l) => (
                <li key={l.id} className="border-b border-gray-100 last:border-0">
                  <Link href={`/law/${encodeURIComponent(l.name)}`} className="flex items-center gap-3 py-2 text-sm hover:text-navy-light">
                    <time className="w-24 shrink-0 tabular-nums text-gray-500">{l.latest_version_date}</time>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-800">{l.name}</span>
                    <span className="shrink-0 text-xs text-gray-400">개정 {l.amendment_count}회</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 누구에게 유용한가 */}
      <section className="border-y border-gray-200 bg-surface px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-5 text-lg font-bold text-gray-900">이런 분께</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {AUDIENCES.map((a) => (
              <li key={a.who} className="flex flex-col rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-sm font-bold text-navy">{a.who}</p>
                <p className="mt-1 flex-1 text-sm text-gray-600">{a.task}</p>
                {a.href.startsWith("#") ? (
                  <a href={a.href} className="mt-3 text-sm font-medium text-navy-light hover:underline">{a.label} →</a>
                ) : (
                  <Link href={a.href} className="mt-3 text-sm font-medium text-navy-light hover:underline">{a.label} →</Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 분야별 법령(짧게) — 전체는 법령 찾기에서 */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold text-gray-900">분야별 법령</h2>
            <Link href="/search" className="text-sm font-medium text-navy-light hover:underline">법령 찾기에서 전체 보기 →</Link>
          </div>
          <ul className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <li key={cat.category}>
                <Link
                  href={`/category/${encodeURIComponent(cat.category)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-navy-light hover:text-navy-light"
                >
                  {cat.category}
                  <span className="text-xs text-gray-400">{cat.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
