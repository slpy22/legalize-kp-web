// T93: 화면 서버 proxy — AI 검색 에이전트(Keenable 등)도 usage/bot 으로 알리고, 받은 경로(pathname, query 제외)를 함께 넘긴다.
// 차단 여부·사람 요청·점검 헤더 전달은 그대로인지 함께 본다. `npm test`(Node 22.6+ 의 TS 타입 지우기).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { register } from "node:module";

process.env.INTERNAL_API_URL = "http://backend.test";
// proxy.ts 의 `next/server` 를 Node ESM 이 찾도록(next 패키지에 exports 표가 없다) — 시험에서만 `next/server.js` 로 잇는다
register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { return n(s === "next/server" ? "next/server.js" : s, c); }'));
const { NextRequest } = await import("next/server.js");
const { proxy } = await import("../proxy.ts");
const { decPath } = await import("../components/admin/decPath.ts");

let sent = [];
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(null, { status: 204 });
};
beforeEach(() => { sent = []; });

const KEENABLE = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Keenable-User/1.0; +https://keenable.ai/bot)";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";
const GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function req(path, ua, extra = {}) {
  return new NextRequest(`https://www.nk-law.kr${path}`, { headers: { "user-agent": ua, "x-real-ip": "203.0.113.9", ...extra } });
}

test("Keenable: 막지 않고, 경로(query 제외)와 함께 알린다", () => {
  const r = proxy(req("/law/%EC%84%B8%EA%B4%80%EB%B2%95?version=2021-01-01", KEENABLE));
  assert.notEqual(r.status, 403);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "http://backend.test/api/v1/usage/bot");
  assert.deepEqual(sent[0].body, { ua: KEENABLE, ip: "203.0.113.9", path: "/law/%EC%84%B8%EA%B4%80%EB%B2%95" });
});

test("사람 브라우저: 알리지 않고 통과(그대로)", () => {
  const r = proxy(req("/law/x", CHROME));
  assert.notEqual(r.status, 403);
  assert.equal(sent.length, 0);
});

test("검색엔진: 그대로 알리고 통과, 이제 경로도 함께", () => {
  const r = proxy(req("/search?q=증권", GOOGLEBOT));
  assert.notEqual(r.status, 403);
  assert.deepEqual(sent[0].body, { ua: GOOGLEBOT, ip: "203.0.113.9", path: "/search" });
});

test("수집 도구·빈 UA: 그대로 403 + 알림", () => {
  assert.equal(proxy(req("/", "python-requests/2.32")).status, 403);
  assert.equal(proxy(req("/", "")).status, 403);
  assert.equal(sent.length, 2);
});

test("점검 헤더 값은 그대로 넘긴다(응답에는 쓰지 않음)", async () => {
  const r = proxy(req("/", KEENABLE, { "x-nklaw-test": "secret-value" }));
  assert.equal(sent[0].body.test, "secret-value");
  assert.equal(r.headers.get("x-nklaw-test"), null);
});

test("바깥 요청 표지(X-Real-IP)가 없으면 아무것도 하지 않는다(헬스체크 등)", () => {
  const r = proxy(new NextRequest("http://localhost/", { headers: { "user-agent": KEENABLE } }));
  assert.notEqual(r.status, 403);
  assert.equal(sent.length, 0);
});

test("decPath: 관리 화면 경로를 글자로, 잘못된 인코딩은 원문 그대로", () => {
  assert.equal(decPath("/law/%EB%8F%84%EB%A1%9C%EB%B2%95"), "/law/도로법");
  assert.equal(decPath("/category/%EC%99%B8%EA%B5%90%C2%B7%EB%8C%80%EC%99%"), "/category/%EC%99%B8%EA%B5%90%C2%B7%EB%8C%80%EC%99%");
  assert.equal(decPath("/a/%EC%99%B8/b/%EC%99"), "/a/외/b/%EC%99");      // 풀리는 덩어리만 푼다
  assert.equal(decPath("/law/도로법"), "/law/도로법");
  assert.equal(decPath(null), "");
  assert.equal(decPath("/x/100%"), "/x/100%");
});
