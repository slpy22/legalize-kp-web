// T116 web: 보이는 상태 누계 15초면 머문 시간을 한 번 미리 보낸다(lib/track.ts dwellMeter). 그 뒤는 지금처럼 숨기거나 떠날 때.
// 서버는 큰 값만 남기므로 값이 틀어지지 않는다. 해외 회선의 출처 없는 한 페이지 방문(규칙 3j)은 머문 시간 신호가 하나도 없을 때만
// 수집으로 정산하므로, 탭을 보이는 채로 오래 두는 사람도 이 신호로 사람으로 남는다. `npm test`(Node 22.6+ 의 TS 타입 지우기).
import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const store = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = { location: { hostname: "www.nk-law.kr", search: "" } };
globalThis.document = { referrer: "", visibilityState: "visible" };
Object.defineProperty(globalThis, "navigator", { value: { cookieEnabled: true }, configurable: true, writable: true });

let sent = [];
globalThis.fetch = async (url, init) => {
  sent.push({ url: String(url), body: JSON.parse(init.body) });
  return new Response(null, { status: 204 });
};

const t = await import("../lib/track.ts");
let now = 0;
const clock = () => now;

beforeEach(() => {
  sent = [];
  now = 0;
  mock.timers.reset();
  mock.timers.enable({ apis: ["setTimeout"] });
});

const advance = (ms) => {
  now += ms;
  mock.timers.tick(ms);
};
const dwells = () => sent.filter((s) => s.url.endsWith("/api/v1/usage/dwell")).map((s) => [s.body.seq, s.body.sec]);

test("보이는 채로 15초 — 한 번 미리 보내고, 그 뒤 더 머물러도 다시 미리 보내지 않는다", () => {
  const m = t.dwellMeter(1, true, clock);
  advance(14_000);
  assert.deepEqual(dwells(), []);
  advance(1_000);
  assert.deepEqual(dwells(), [[1, 15]]);
  advance(600_000);
  assert.deepEqual(dwells(), [[1, 15]]);
  m.hide();                                          // 숨기면 지금처럼 누계(서버는 큰 값만 남김)
  assert.deepEqual(dwells(), [[1, 15], [1, 615]]);
});

test("숨긴 시간은 세지 않는다 — 10초 보고 숨겼다가 다시 5초 보면 그때 15", () => {
  const m = t.dwellMeter(2, true, clock);
  advance(10_000);
  m.hide();
  assert.deepEqual(dwells(), [[2, 10]]);
  advance(60_000);                                   // 숨긴 동안은 미리 보내지 않는다
  assert.deepEqual(dwells(), [[2, 10]]);
  m.show();
  advance(4_000);
  assert.deepEqual(dwells(), [[2, 10]]);
  advance(1_000);
  assert.deepEqual(dwells(), [[2, 10], [2, 15]]);
});

test("숨긴 채로 열린 페이지는 보일 때부터 잰다", () => {
  const m = t.dwellMeter(3, false, clock);
  advance(30_000);
  assert.deepEqual(dwells(), []);
  m.show();
  advance(15_000);
  assert.deepEqual(dwells(), [[3, 15]]);
});

test("15초 전에 옮겨 가면 마지막 누계 한 번만 — 타이머가 남지 않는다", () => {
  const m = t.dwellMeter(4, true, clock);
  advance(7_000);
  m.end();
  assert.deepEqual(dwells(), [[4, 7]]);
  advance(60_000);
  assert.deepEqual(dwells(), [[4, 7]]);
});

test("0초는 보내지 않는다(지금과 같음)", () => {
  const m = t.dwellMeter(5, true, clock);
  m.end();
  assert.deepEqual(dwells(), []);
});

test("보내는 본문은 지금과 같은 {visit, seq, sec} — 새로 모으는 값이 없다", () => {
  const m = t.dwellMeter(6, true, clock);
  advance(15_000);
  assert.equal(sent.length, 1);
  assert.deepEqual(Object.keys(sent[0].body).sort(), ["sec", "seq", "visit"]);
  m.end();
});

test("UsageTracker 가 dwellMeter 로 잰다(숨김·떠남·옮김)", () => {
  const src = readFileSync(new URL("../components/UsageTracker.tsx", import.meta.url), "utf8");
  assert.match(src, /dwellMeter\(seq, document\.visibilityState === "visible"\)/);
  assert.match(src, /meter\.hide\(\)/);
  assert.match(src, /meter\.show\(\)/);
  assert.match(src, /meter\.end\(\)/);
  assert.equal(t.EARLY_DWELL_SEC, 15);
});
