import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * T47: 화면(HTML) 자동 수집 억제 — 수집 도구·AI 학습 크롤러로 보이는 User-Agent 를 403 으로 돌려보낸다.
 * 상태를 두지 않는다(요청 빈도 제한은 nginx limit_req 몫, API 는 백엔드 access_guard 가 맡는다).
 * 바깥 요청(nginx 가 X-Real-IP 를 붙인 것)만 본다 — 컨테이너 헬스체크(wget)·내부 호출은 그대로 통과한다.
 * X-Forwarded-For 로는 가를 수 없다: Next 서버가 모든 요청에 스스로 붙인다(t47 검증에서 헬스체크까지 403 이 됨).
 * 검색엔진(Googlebot·Yeti·Bingbot·Daum)은 막지 않는다.
 */
const BAD_UA =
  /python-requests|python-urllib|aiohttp|httpx|\bcurl\/|\bwget\b|go-http-client|java\/|okhttp|libwww-perl|scrapy|httpclient|node-fetch|axios|headlesschrome|phantomjs|puppeteer|playwright|selenium|gptbot|chatgpt-user|oai-searchbot|ccbot|claudebot|claude-web|anthropic-ai|bytespider|perplexitybot|meta-externalagent|amazonbot|cohere-ai|diffbot|omgilibot|imagesiftbot|timpibot|youbot|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot/i;

// T52: 검색엔진 UA(역DNS 확인은 백엔드가 한다)
const SEARCH_UA = /googlebot|google-inspectiontool|yeti|bingbot|daum/i;
const INTERNAL_API = process.env.INTERNAL_API_URL || "";

/** 봇 화면 요청을 백엔드에 알린다(T52 — 방문자 수와 따로 셈). 기다리지 않고, 실패해도 화면에 영향이 없다. */
function reportBot(ua: string, ip: string) {
  if (!INTERNAL_API) return;
  void fetch(`${INTERNAL_API}/api/v1/usage/bot`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ua: ua.slice(0, 400), ip }),
  }).catch(() => {});
}

export function proxy(request: NextRequest) {
  const ip = request.headers.get("x-real-ip");
  if (!ip) return NextResponse.next();
  const ua = request.headers.get("user-agent") || "";
  const bad = !ua.trim() || BAD_UA.test(ua);
  if (bad || SEARCH_UA.test(ua)) reportBot(ua, ip);
  if (!bad) return NextResponse.next();
  return new NextResponse(
    "자동 수집 도구로 보이는 접근은 허용하지 않습니다. 이용 조건: https://www.nk-law.kr/about/data\n" +
      "Automated collection is not permitted. Terms: https://www.nk-law.kr/terms#copyright\n",
    { status: 403, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } },
  );
}

export const config = {
  // 정적 파일·API·robots·sitemap·아이콘은 건너뛴다(robots.txt 는 크롤러가 읽어야 한다)
  matcher: [
    "/((?!api/|_next/|robots\\.txt|sitemap\\.xml|favicon\\.ico|icon\\.png|apple-icon\\.png|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|css|js|map|woff2?)$).*)",
  ],
};
