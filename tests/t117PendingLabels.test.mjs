// T117 관리 화면: 정산 대기 규칙 3j(해외 회선 수집 무리 — backend 규칙, 사유 이름 crawl_swarm) 라벨과 대기 합계.
// 라벨은 lib/account.ts 한 곳(PENDING_RULE_LABEL)에서 방문자 수 줄(VisitorStats)·방문 목록(VisitPaths)이 같이 쓴다.
// 3j 칸이 없는 옛 backend 응답도 그대로 보인다(0 으로). `npm test`(Node 22.6+ 의 TS 타입 지우기).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const a = await import("../lib/account.ts");
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

const pending = (visits) => ({ visitors_today: 2, days: [], visitors_by_rule: { "3f": 0, "3i": 0, "3g": 0 }, visits,
  unmatched_visits: 0, next_settle_kst: null, settle_after_min: 70, auto_quiet_min: 5 });

test("라벨: 네 규칙 모두, 3j 는 '해외 회선 수집 무리'", () => {
  assert.deepEqual(a.PENDING_RULE_LABEL, { "3f": "데이터센터 단발", "3i": "회전 프록시", "3j": "해외 회선 수집 무리", "3g": "자동 열람" });
  assert.deepEqual([...a.PENDING_RULES], ["3f", "3i", "3j", "3g"]);
});

test("대기 합계에 3j 를 넣는다(3g 는 묶음 수)", () => {
  const p = pending({ "3f": 2, "3i": 1, "3j": 3, "3g_bursts": 1, "3g_events": 7 });
  assert.equal(a.pendingVisitsTotal(p), 7);
  assert.deepEqual(a.pendingVisitsByRule(p), [["3f", 2], ["3i", 1], ["3j", 3], ["3g", 1]]);
});

test("3j 칸이 없는 옛 backend 응답은 0 으로 — 합계가 NaN 이 되지 않는다", () => {
  const p = pending({ "3f": 1, "3i": 1, "3g_bursts": 0, "3g_events": 0 });
  assert.equal(a.pendingVisitsTotal(p), 2);
  assert.deepEqual(a.pendingVisitsByRule(p).find(([r]) => r === "3j"), ["3j", 0]);
});

test("분류 상태 줄: dc_pending(3f·3i·3j 합)을 규칙별로 풀고, 옛 backend 는 합만", () => {
  assert.equal(a.settlePendingNote({ dc_pending: 6, split_pending: 2, swarm_pending: 1 }),
    "방문 정산 대기 6(데이터센터 단발 3 · 회전 프록시 2 · 해외 회선 수집 무리 1)");
  assert.equal(a.settlePendingNote({ dc_pending: 3, split_pending: 0 }), "방문 정산 대기 3(데이터센터 단발 3)");
  assert.equal(a.settlePendingNote({ dc_pending: 0, split_pending: 0, swarm_pending: 0 }), "방문 정산 대기 0");
  assert.equal(a.settlePendingNote({ dc_pending: 4 }), "방문 정산 대기 4");
});

test("화면이 한 곳의 라벨·합계를 쓴다(따로 적은 규칙 표가 남지 않음)", () => {
  const vs = src("components/admin/VisitorStats.tsx");
  assert.match(vs, /pendingVisitsTotal\(p\)/);
  assert.match(vs, /PENDING_RULE_LABEL\[r\]/);
  assert.doesNotMatch(vs, /"3i": "회전 프록시"/);
  assert.doesNotMatch(vs, /p\.visits\["3f"\] \+ p\.visits\["3i"\]/);
  const vp = src("components/admin/VisitPaths.tsx");
  assert.match(vp, /const PENDING: Record<string, string> = PENDING_RULE_LABEL;/);
  const cs = src("components/admin/ClassifyStats.tsx");
  assert.match(cs, /crawl_swarm: "해외 회선 수집 무리 — /);
  assert.match(cs, /settlePendingNote\(/);
  assert.doesNotMatch(cs, /데이터센터 방문 정산 대기/);
});

test("화면 문구에 일감 번호를 넣지 않는다", () => {
  const cs = src("components/admin/ClassifyStats.tsx");
  const line = cs.split("\n").find((l) => l.includes("crawl_swarm:"));
  assert.doesNotMatch(line, /T\d{2,3}/);
});
