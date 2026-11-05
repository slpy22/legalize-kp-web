// T107: 이용 기록 비컨 — ① 화면 자체 이동 표지(nav:"auto")는 두 번째 이후 페이지 기록에만, 출처와 함께 쓰지 않는다.
// ③ 출처(ref·utm)는 순번이 있는 페이지 기록이면 seq 2 이상에도 실린다(부르는 쪽이 '문서를 새로 연 첫 기록'에만 넘김).
// isLanding 은 문서마다 처음 한 번만, 새로고침·뒤로/앞으로 문서는 false.
// ③ 원인(2026-11-05 01:02): 11-04 13:19 방문의 같은 탭을 11시간 43분 뒤 다시 열어 탭 순번이 2 로 이어졌다 —
// 문서를 새로 열 때 탭이 30분 넘게 쉬었으면 임시 방문 ID·순번을 새로 시작한다. `npm test`(Node 22.6+ 의 TS 타입 지우기).
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { location: { hostname: "www.nk-law.kr", search: "?utm_source=chatgpt.com" } };
globalThis.document = { referrer: "", visibilityState: "visible" };
Object.defineProperty(globalThis, "navigator", { value: { cookieEnabled: true }, configurable: true, writable: true });

let sent = [];
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(null, { status: 204 });
};
beforeEach(() => { sent = []; });

let navType = "navigate";
const realEntries = performance.getEntriesByType.bind(performance);
performance.getEntriesByType = (t) => (t === "navigation" ? [{ type: navType }] : realEntries(t));

let n = 0;
const fresh = () => import(`../lib/track.ts?doc=${++n}`);     // 새 문서(모듈 상태 새로)

test("출처: seq 2 페이지 기록에도 ref·utm 이 실린다(같은 탭에서 바깥 링크로 다시 들어온 경우)", async () => {
  const t = await fresh();
  t.track("page", { path: "/law/x", seq: 2, ref: "", utm: "chatgpt.com" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.seq, 2);
  assert.equal(sent[0].body.ref, "");
  assert.equal(sent[0].body.utm, "chatgpt.com");
  assert.equal(sent[0].body.nav, undefined);
});

test("자체 이동: nav=auto 는 seq 2 이상 페이지에만 실리고, seq 1·법령 조회·출처와 함께면 빠진다", async () => {
  const t = await fresh();
  t.track("page", { path: "/compare/x", seq: 2, nav: "auto" });
  t.track("page", { path: "/compare", seq: 1, nav: "auto" });
  t.track("page", { path: "/compare/x", seq: 3, nav: "auto", ref: "" });
  assert.equal(sent.length, 3);
  assert.equal(sent[0].body.nav, "auto");
  assert.equal(sent[1].body.nav, undefined);
  assert.equal(sent[2].body.nav, undefined);
  assert.equal(sent[2].body.ref, "");
});

test("isLanding: 새로 연 문서는 처음 한 번만 true", async () => {
  navType = "navigate";
  const t = await fresh();
  assert.equal(t.isLanding(), true);
  assert.equal(t.isLanding(), false);
});

test("isLanding: 새로고침·뒤로/앞으로 문서는 false", async () => {
  for (const ty of ["reload", "back_forward"]) {
    navType = ty;
    const t = await fresh();
    assert.equal(t.isLanding(), false, ty);
  }
  navType = "navigate";
});

test("UsageTracker: 출처는 seq 1 또는 문서 첫 기록에, 자체 이동은 5초 안·사람 조작 없음일 때", () => {
  const src = readFileSync(new URL("../components/UsageTracker.tsx", import.meta.url), "utf8");
  assert.match(src, /export const SELF_MOVE_MS = 5000;/);
  assert.match(src, /seq && \(seq === 1 \|\| landing\) \? entrySource\(\) : seq && self \? \{ nav: "auto" as const \} : \{\}/);
  assert.match(src, /now - prev <= SELF_MOVE_MS && lastInput\.current < prev/);
  for (const ev of ["pointerdown", "keydown", "touchstart"]) assert.ok(src.includes(`"${ev}"`), ev);
  assert.match(src, /addEventListener\("popstate", mark\)/);
});

test("새 방문: 문서를 새로 열 때 탭이 30분 넘게 쉬었으면 방문 ID·순번을 새로 시작한다(B 재현)", async () => {
  store.clear();
  const realNow = Date.now;
  const t0 = Date.UTC(2026, 10, 4, 4, 19);    // T114: 시계 고정(KST 자정을 넘기면 날짜 규칙이 끼어든다)
  try {
    Date.now = () => t0;
    const day1 = await fresh();                 // 11-04 13:19 — 첫 문서
    assert.equal(day1.nextSeq(), 1);
    const v1 = day1.tabVisit();
    Date.now = () => t0 + (11 * 60 + 43) * 60 * 1000;     // 11시간 43분 뒤(11-05 01:02) 같은 탭에서 문서를 다시 연다
    const day2 = await fresh();
    assert.equal(day2.nextSeq(), 1);           // 예전에는 2
    assert.notEqual(day2.tabVisit(), v1);
    // T114: 같은 문서 안 이동은 2시간 쉬어도 그대로(3시간 넘게 쉬거나 날짜가 바뀌면 새 방문 — tests/t114Web.test.mjs)
    Date.now = () => t0 + (11 * 60 + 43) * 60 * 1000 + 2 * 3600 * 1000;
    assert.equal(day2.nextSeq(), 2);
  } finally {
    Date.now = realNow;
  }
});

test("새 방문 아님: 30분 안에 문서를 다시 열면 같은 방문 ID 로 순번이 이어진다", async () => {
  store.clear();
  const realNow = Date.now;
  const t0 = Date.UTC(2026, 10, 5, 1, 0);     // T114: 시계 고정(10:00 KST — 자정을 넘기지 않게)
  Date.now = () => t0;
  const a = await fresh();
  assert.equal(a.nextSeq(), 1);
  const v1 = a.tabVisit();
  try {
    Date.now = () => t0 + 29 * 60 * 1000;
    const b = await fresh();
    assert.equal(b.nextSeq(), 2);
    assert.equal(b.tabVisit(), v1);
  } finally {
    Date.now = realNow;
  }
});
