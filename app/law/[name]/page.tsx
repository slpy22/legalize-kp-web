import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { fetchLaw, fetchLawVersions } from "@/lib/api";
import UnavailableNotice from "@/components/UnavailableNotice";
import ArticleView from "@/components/ArticleView";
import VersionSelector from "@/components/VersionSelector";
import VersionFullText from "@/components/VersionFullText";
import ProvenanceBadges from "@/components/ProvenanceBadges";
import type { LawDetail, LawVersionDetail } from "@/lib/types";
import { diffHref } from "@/lib/showcase";
import { TrackOnMount } from "@/components/UsageTracker";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  try {
    const data = await fetchLaw(name);
    const law = data.law;
    return {
      title: `${name} - 북한 법령`,
      description: `북한 ${name} 전문. ${law.total_articles || ""}개 조문, 카테고리: ${law.category || ""}. 조문 열람, 개정이력, 남북법 비교.`,
      alternates: { canonical: `https://www.nk-law.kr/law/${encodeURIComponent(name)}` },
      openGraph: {
        title: `${name} | 북한법률정보센터`,
        description: `북한 ${name} 전문 열람. ${law.total_articles || ""}개 조문.`,
        url: `https://www.nk-law.kr/law/${encodeURIComponent(name)}`,
        // openGraph 를 직접 정하면 app/opengraph-image.png(파일 규약)가 빠져서 명시한다(T42)
        images: ["/opengraph-image.png"],
      },
    };
  } catch {
    return { title: `${name} - 북한 법령` };
  }
}

/** T66: 빠진 조 번호들을 '이 조 앞에'(없으면 끝에) 묶음으로 — 이어진 번호는 한 상자에 */
function buildGaps(missing: string[], present: string[]): { before: string | null; numbers: string[] }[] {
  const num = (s: string) => (/^\d+$/.test(s) ? parseInt(s, 10) : NaN);
  return missing.reduce<{ before: string | null; numbers: string[] }[]>((acc, m) => {
    const n = num(m);
    const next = Number.isNaN(n) ? undefined : present.find((p) => num(p) > n);
    const before = next ?? null;
    const last = acc[acc.length - 1];
    return last && last.before === before
      ? [...acc.slice(0, -1), { before, numbers: [...last.numbers, m] }]
      : [...acc, { before, numbers: [m] }];
  }, []);
}

export default async function LawPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { name: rawName } = await params;
  const { version } = await searchParams;
  const name = decodeURIComponent(rawName);

  // 본문 + 버전 메타 목록을 병렬로 가져옴
  const [data, versionsResp] = await Promise.all([
    fetchLaw(name, version),
    fetchLawVersions(name).catch(() => ({ law_name: name, versions: [], total: 0 })),
  ]);
  const law = data.law;
  const articles = data.articles;
  const textStatus = data.meta?.text;          // T54: 본문 미확보면 조문 대신 근거·확실성
  const unavailable = textStatus?.available === false;
  const versionInfo = (data as LawVersionDetail).version; // version param 줬을 때만 존재
  // T66: 최신 판본이 일부본이면 빠진 조 자리에 직전 전문 판본 링크를 끼운다(다른 판본 조문을 합치지 않음)
  const excerpt = versionInfo ? undefined : (data as LawDetail).excerpt;
  const gaps = excerpt ? buildGaps(excerpt.missing, articles.map((a) => String(a.article_number))) : [];
  const versions = versionsResp.versions || [];
  // 최근 두 판본(T42) — 2개 이상이면 '최근 두 판본 비교' 바로가기로 결과까지 한 번에
  const recentTwo = [...versions]
    .map((v) => v.version_date)
    .filter(Boolean)
    .sort()
    .slice(-2);

  // 서문 추출 — full_text 의 frontmatter 제거 후 '## 서 문' ~ '## 제N장' 사이.
  // articles 에는 '제N조'만 들어가서 ArticleView 가 서문을 렌더 못 하므로 별도 표시한다.
  const fullText = versionInfo?.full_text ?? law.full_text ?? "";
  const preamble = (() => {
    if (!fullText) return "";
    let body = fullText;
    if (body.startsWith("---")) {
      const parts = body.split("---");
      if (parts.length >= 3) body = parts.slice(2).join("---");
    }
    const m = body.match(/##\s*서\s*문\s*\n+([\s\S]+?)(?=\n\s*##\s*제)/);
    return m ? m[1].trim() : "";
  })();

  /* 장 목록 추출 (순서 유지, 중복 제거) */
  const chapters: string[] = [];
  for (const art of articles) {
    if (art.chapter && !chapters.includes(art.chapter)) {
      chapters.push(art.chapter);
    }
  }

  // JSON-LD 구조화 데이터
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name: name,
    legislationType: "Law",
    jurisdiction: { "@type": "AdministrativeArea", name: "조선민주주의인민공화국" },
    datePublished: law.enactment_date || undefined,
    dateModified: law.latest_version_date || undefined,
    description: `북한 ${name}. ${law.category || ""} 분야. ${law.total_articles || ""}개 조문.`,
    url: `https://www.nk-law.kr/law/${encodeURIComponent(name)}`,
    inLanguage: "ko",
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    {/* T43: 법령 조회 이용 기록(익명) — '자주 찾는 법령' 집계 */}
    <TrackOnMount kind="law_view" law={law.name} />
    <section className="mx-auto max-w-6xl px-4 py-8">
      {/* 브레드크럼 */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/category/${encodeURIComponent(law.category)}`}
          className="hover:text-navy-light"
        >
          {law.category}
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">{law.name}</span>
      </nav>

      {/* 메타데이터 카드 */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-navy">
            {law.name}
            {versionInfo && (
              <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 align-middle text-sm font-medium text-amber-800">
                {versionInfo.version_date} 버전
              </span>
            )}
            {/* T7: 출처 라벨 + OCR 본문 경고 (판본 지정 시 그 판본 기준) */}
            <ProvenanceBadges
              p={versionInfo?.provenance ?? data.meta?.provenance}
              className="ml-2"
            />
          </h1>
          <VersionSelector
            lawName={law.name}
            versions={versions}
            current={versionInfo?.version_date ?? null}
            currentDate={law.latest_version_date}
          />
        </div>
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-gray-500">카테고리</dt>
            <dd className="font-medium">{law.category}</dd>
          </div>
          <div>
            <dt className="text-gray-500">채택일</dt>
            {/* T54 ver2: 일까지 모르는 채택(본문 미확보 법령)은 'YYYY-MM' 그대로 */}
            <dd className="font-medium">{law.enactment_date ?? textStatus?.adopted ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">
              {versionInfo ? "보는중 버전" : "최신버전"}
            </dt>
            <dd className="font-medium">
              {versionInfo
                ? versionInfo.version_date
                : (law.latest_version_date ?? textStatus?.latest ?? "-")}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">조문수</dt>
            <dd className="font-medium">
              {unavailable ? "본문 미확보" : `${versionInfo ? articles.length : (law.total_articles ?? 0)}조`}
            </dd>
          </div>
          {!unavailable && (
            <div>
              <dt className="text-gray-500">장수</dt>
              <dd className="font-medium">{law.chapter_count}장</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">출처</dt>
            <dd className="font-medium">
              {/* T54 ver2: 출처 코드 대신 사람이 읽는 이름(예: center_tracked → 센터 추적) */}
              {versionInfo
                ? (versionInfo.source_desc?.label ?? versionInfo.source ?? "-")
                : (data.meta?.source_desc?.label ?? law.source)}
            </dd>
          </div>
        </dl>
        {versionInfo && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
            * 과거 시점의 본문을 보고 있습니다. 셀렉터에서 “현행본”을 선택하면 최신 본문으로 돌아갑니다.
          </p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href={`/law/${encodeURIComponent(law.name)}/history`}
          className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
        >
          개정이력
        </Link>
        {recentTwo.length === 2 && (
          <Link
            href={diffHref(law.name, recentTwo[0], recentTwo[1])}
            className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
          >
            최근 두 판본 비교 ({recentTwo[0].slice(0, 4)} → {recentTwo[1].slice(0, 4)})
          </Link>
        )}
        {!unavailable && (
          <Link
            href={`/diff?name=${encodeURIComponent(law.name)}`}
            className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
          >
            신구비교
          </Link>
        )}
        {/* T42: 매핑 상세로 바로 간다(매핑이 없는 법령은 상세 페이지가 그 사실을 알려 준다) */}
        <Link
          href={`/compare/${encodeURIComponent(law.name)}`}
          className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white"
        >
          남북비교
        </Link>
      </div>

      {/* 본문 + 목차 사이드바 */}
      <div className="flex gap-8">
        {/* 본문 */}
        <div className="min-w-0 flex-1">
          {preamble && !(versionInfo && articles.length === 0) && (
            <section
              id="preamble"
              className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h2 className="mb-3 text-lg font-bold text-navy">서 문</h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
                {preamble}
              </div>
            </section>
          )}
          {unavailable && textStatus && <UnavailableNotice text={textStatus} lawName={law.name} />}
          <Suspense fallback={<div className="py-8 text-center text-gray-400">조문 로딩 중...</div>}>
            {unavailable ? null : versionInfo && articles.length === 0 ? (
              <VersionFullText text={versionInfo.full_text} />
            ) : (
              <>
                {excerpt && (
                  <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    최신 판본({excerpt.latest_version})은 일부 조만 있는 <strong>일부본</strong>입니다(원천 자료가 빠짐).
                    없는 조 {excerpt.missing.length}개는{" "}
                    <Link href={`/law/${encodeURIComponent(law.name)}?version=${excerpt.fallback_version}`} className="font-semibold underline">
                      직전 전문 판본({excerpt.fallback_version})
                    </Link>
                    에서 볼 수 있습니다. 아래 본문은 최신 판본 그대로입니다.
                  </p>
                )}
                <ArticleView
                  articles={articles}
                  gaps={gaps}
                  gapVersion={excerpt?.fallback_version}
                  gapLink={excerpt ? `/law/${encodeURIComponent(law.name)}?version=${excerpt.fallback_version}` : undefined}
                />
              </>
            )}
          </Suspense>
        </div>

        {/* 목차 사이드바 */}
        {chapters.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-4">
              <h4 className="mb-3 text-sm font-bold text-gray-700">목차</h4>
              <ul className="space-y-1 text-sm">
                {chapters.map((ch) => (
                  <li key={ch}>
                    <a
                      href={`#chapter-${ch}`}
                      className="block rounded px-2 py-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-navy-light"
                    >
                      {ch}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </section>
    </>
  );
}
