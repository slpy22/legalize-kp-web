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
// T85(이용통계 제안): 백엔드 분류기(app/usage/classify.py SEARCH_UA)와 같은 이름들. 'daum' 은 'daum/'·'daumoa' 로 좁혀
// 다음 앱(DaumApps) 사용자를 봇으로 알리지 않는다. 이 표지는 usage/bot 으로 알리는 데만 쓰고 차단·방문자 수에는 쓰지 않는다.
const SEARCH_UA =
  /googlebot|google-inspectiontool|googleother|adsbot-google|mediapartners-google|storebot-google|\byeti\b|bingbot|adidxbot|bingpreview|\bdaum\/|daumoa|baiduspider|yandex\w*bot|yandeximages|applebot|sogou \w+ spider/i;
// T93: AI 검색 에이전트(질문을 받아 페이지를 가져가는 수집기 — 차단하지 않는다). 백엔드 분류기(app/usage/classify.py AGENT_UA)와 같은 이름들.
// 이 표지도 usage/bot 으로 알리는 데만 쓴다. 백엔드는 이 수집기가 받은 경로를 잠깐 기억해, 곧바로 같은 경로를 같은 운영자 대역에서 연
// 브라우저(화면 JS 를 실행하는 렌더러)를 봇으로 뺀다.
const AGENT_UA = /keenable-user|reflectionbot/i;
const INTERNAL_API = process.env.INTERNAL_API_URL || "";

/** 봇 화면 요청을 백엔드에 알린다(T52 — 방문자 수와 따로 셈). 기다리지 않고, 실패해도 화면에 영향이 없다.
 * T90: 점검 접속 표시 헤더(X-Nklaw-Test)가 있으면 그 값을 그대로 넘긴다 — 맞는지는 백엔드가 가린다(맞으면 봇 분류 대신 내부 점검 접속).
 * 값은 로그·응답에 쓰지 않는다.
 * T93: 받은 경로(pathname — query 는 보내지 않음)를 함께 넘긴다(렌더러 뒤따름 판정의 '같은 경로' 확인용). */
function reportBot(ua: string, ip: string, test: string | null, path: string) {
  if (!INTERNAL_API) return;
  void fetch(`${INTERNAL_API}/api/v1/usage/bot`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ua: ua.slice(0, 400), ip, path: path.slice(0, 300), ...(test ? { test: test.slice(0, 200) } : {}) }),
  }).catch(() => {});
}

export function proxy(request: NextRequest) {
  const ip = request.headers.get("x-real-ip");
  if (!ip) return NextResponse.next();
  const ua = request.headers.get("user-agent") || "";
  const bad = !ua.trim() || BAD_UA.test(ua);
  if (bad || SEARCH_UA.test(ua) || AGENT_UA.test(ua)) reportBot(ua, ip, request.headers.get("x-nklaw-test"), request.nextUrl.pathname);
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
