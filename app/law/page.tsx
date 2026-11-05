import type { Metadata } from "next";
import Link from "next/link";
import { fetchCategories } from "@/lib/api";
import type { RefData } from "@/lib/types";
import CategoryGrid from "@/components/CategoryGrid";
import SearchBar from "@/components/SearchBar";

/**
 * T120: /law — 법령 목록. 페이스북에 nk-law.kr/law/ 가 공유됐는데 이 주소에 화면이 없어 404(미리보기 카드 제목도
 * '페이지를 찾을 수 없습니다')였다. /search(검색어 없음)의 분야별 목록(CategoryGrid)을 그대로 쓰고, 다른 곳으로
 * 보내지 않는다. 서버에서 그려 공유 미리보기·검색 로봇도 목록을 본다. /law/ 는 Next 기본 규칙(끝 '/' 떼기, 308)으로 여기 온다.
 * canonical 은 자기 주소(/law) — /law/[name] 의 윗 주소이고, 미리보기 카드 주소(og:url)도 이 주소다.
 */
export const dynamic = "force-dynamic";

const URL_LAW = "https://www.nk-law.kr/law";
const TITLE = "북한 법령 목록";

function describe(total: number | null) {
  return `북한 법령${total ? ` ${total}건` : ""}을 분야별로 둘러보는 목록. 분야를 고르면 법령마다 조문·개정 이력·판본 신구비교로 이어집니다.`;
}

export async function generateMetadata(): Promise<Metadata> {
  let total: number | null = null;
  try {
    total = (await fetchCategories()).total_laws ?? null;
  } catch {
    /* 숫자 없이 */
  }
  const description = describe(total);
  return {
    title: TITLE,
    description,
    alternates: { canonical: URL_LAW },
    // openGraph·twitter 를 여기서 정하면 app/layout 의 값(사이트 이름·종류·카드 크기)과 파일 규약 이미지가 통째로
    // 빠진다(얕은 병합) — 공유 카드에 필요한 것을 모두 적는다.
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "북한법률정보센터",
      title: `${TITLE} | 북한법률정보센터`,
      description,
      url: URL_LAW,
      images: ["/opengraph-image.png"],
    },
    twitter: { card: "summary_large_image", title: `${TITLE} | 북한법률정보센터`, description },
  };
}

export default async function LawListPage() {
  let data: RefData | null = null;
  try {
    data = await fetchCategories();
  } catch {
    data = null;
  }
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link prefetch={false} href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        <span className="font-medium text-gray-800">법령 목록</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-gray-800">{TITLE}</h1>
      <p className="mb-6 text-sm text-gray-600">
        분야를 고르면 그 분야의 법령이 나옵니다. 법령명이나 조문 내용으로 찾으려면 아래 검색창이나{" "}
        <Link prefetch={false} href="/search" className="font-medium text-navy-light hover:underline">
          법령 찾기
        </Link>
        를 쓰세요.
      </p>
      <div className="mb-8">
        <SearchBar />
      </div>

      <CategoryGrid data={data} failed={data === null} />
    </section>
  );
}
