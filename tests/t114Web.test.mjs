// T114 web: ① proxy — 방문자 쿠키 없는 옛 Chrome(110 미만) 문서 요청을 usage/bot 에 hint 로 알린다(막지 않음·점검 접속·쿠키 있음·
// 문서가 아닌 요청은 알리지 않음). ② lib/track.ts — 사이트 안 이동이라도 KST 날짜가 바뀌었거나 3시간 넘게 쉬었으면 새 임시 방문(출처 없이).
// `npm test` (Node 22.6+ 의 TS 타입 지우기)
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

process.env.INTERNAL_API_URL = "http://backend.test";
register("data:text/javascript," + encodeURIComponent(
  'export async function resolve(s, c, n) { return n(s === "next/server" ? "next/server.js" : s, c); }'));
const { NextRequest } = await import("next/server.js");
const { proxy } = await import("../proxy.ts");

let sent = [];
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(null, { status: 204 });
};
beforeEach(() => { sent = []; });

const CHROME48 = "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Safari/537.36";
const CHROME109 = "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36";
const CHROME156 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36";
const DOC = "/law/%EC%97%B0%EC%9C%A0%EB%B2%95/history";

function req(path, ua, extra = {}) {
  return new NextRequest(`https://www.nk-law.kr${path}`, { headers: { "user-agent": ua, "x-real-ip": "119.249.100.7", ...extra } });
}

test("proxy: 쿠키 없는 옛 Chrome 문서 요청 — 막지 않고 hint 로 알린다(경로만, query 없음)", () => {
  const r = proxy(req(DOC + "?v=1", CHROME48, { accept: "text/html,application/xhtml+xml" }));
  assert.notEqual(r.status, 403);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].url, "http://backend.test/api/v1/usage/bot");
  assert.deepEqual(sent[0].body, { ua: CHROME48, ip: "119.249.100.7", path: DOC, hint: "old_chrome_first" });
});

test("proxy: Chrome 109 도 옛 판, 110 이상·쿠키 있음·점검 접속·문서 아닌 요청은 알리지 않는다", () => {
  proxy(req(DOC, CHROME109));
  assert.equal(sent.length, 1);
  sent = [];
  proxy(req(DOC, CHROME156));
  proxy(req(DOC, CHROME48, { cookie: "nklaw_vid=abc" }));
  proxy(req(DOC, CHROME48, { "x-nklaw-test": "secret-value" }));
  proxy(req(DOC, CHROME48, { "sec-fetch-dest": "empty" }));
  proxy(req(DOC, CHROME48, { accept: "*/*" }));
  assert.equal(sent.length, 0);
});

test("proxy: 문서 요청 표지(sec-fetch-dest: document)는 알린다", () => {
  proxy(req(DOC, CHROME48, { "sec-fetch-dest": "document", accept: "text/html" }));
  assert.equal(sent.length, 1);
});

// ② track.ts
const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { location: { hostname: "www.nk-law.kr", search: "" } };
globalThis.document = { referrer: "https://chatgpt.com/", visibilityState: "visible" };
Object.defineProperty(globalThis, "navigator", { value: { cookieEnabled: true }, configurable: true, writable: true });

let n = 0;
const fresh = () => import(`../lib/track.ts?doc=${++n}`);
const realNow = Date.now;
let clock = Date.UTC(2026, 10, 4, 9, 2);            // 11-04 18:02 KST
Date.now = () => clock;
const H = 3600 * 1000;

test("track: 같은 문서 안 이동 — 3시간 안이면 같은 방문, 순번이 이어진다", async () => {
  store.clear();
  clock = Date.UTC(2026, 10, 4, 9, 2);
  const t = await fresh();
  assert.equal(t.nextSeq(), 1);
  const v1 = t.tabVisit();
  clock += 2 * H;                                    // 2시간 읽고 사이트 안 링크
  assert.equal(t.nextSeq(), 2);
  assert.equal(t.tabVisit(), v1);
});

test("track: 다음 날 사이트 안 이동(b4f4de68 꼴) — 새 임시 방문, 순번 1, 출처는 붙이지 않는다", async () => {
  store.clear();
  clock = Date.UTC(2026, 10, 4, 9, 2);               // 11-04 18:02 KST
  const t = await fresh();
  assert.equal(t.nextSeq(), 1);
  const v1 = t.tabVisit();
  clock = Date.UTC(2026, 10, 5, 3, 57);              // 11-05 12:57 KST
  assert.equal(t.nextSeq(), 1);
  assert.notEqual(t.tabVisit(), v1);
  sent = [];
  t.track("page", { path: "/law/x", seq: 1, ref: "chatgpt.com" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.seq, 1);
  assert.equal(sent[0].body.ref, undefined);
  assert.equal(sent[0].body.utm, undefined);
  t.track("page", { path: "/law/y", seq: 2 });       // 그 뒤 페이지는 그대로
  assert.equal(sent[1].body.visit, t.tabVisit());
});

test("track: 같은 날이라도 3시간 넘게 쉬고 사이트 안 이동이면 새 방문", async () => {
  store.clear();
  clock = Date.UTC(2026, 10, 5, 0, 0);               // 09:00 KST
  const t = await fresh();
  t.nextSeq();
  const v1 = t.tabVisit();
  clock += 3 * H + 60_000;
  assert.equal(t.nextSeq(), 1);
  assert.notEqual(t.tabVisit(), v1);
});

test("track: 머문 시간 기록이 마지막 기록 시각을 새로 한다 — 긴 읽기 뒤 이동은 같은 방문", async () => {
  store.clear();
  clock = Date.UTC(2026, 10, 5, 0, 0);
  const t = await fresh();
  t.nextSeq();
  const v1 = t.tabVisit();
  clock += 2.5 * H;
  t.trackDwell(1, 3600);                             // 탭을 숨기거나 옮길 때 보낸다
  clock += 1 * H;
  assert.equal(t.nextSeq(), 2);
  assert.equal(t.tabVisit(), v1);
});

test("track: 새 문서는 자정을 넘기면 30분 안이어도 새 방문(문서 출처는 그대로 붙음)", async () => {
  store.clear();
  clock = Date.UTC(2026, 10, 4, 14, 50);             // 23:50 KST
  const t1 = await fresh();
  t1.nextSeq();
  const v1 = t1.tabVisit();
  clock = Date.UTC(2026, 10, 4, 15, 5);              // 00:05 KST
  const t2 = await fresh();
  assert.equal(t2.nextSeq(), 1);
  assert.notEqual(t2.tabVisit(), v1);
  sent = [];
  t2.track("page", { path: "/", seq: 1, ref: "chatgpt.com" });
  assert.equal(sent[0].body.ref, "chatgpt.com");
  Date.now = realNow;
});
