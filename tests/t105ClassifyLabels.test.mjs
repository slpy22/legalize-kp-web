// T105: 관리 화면 분류 사유 이름표 — 자동 열람(auto_browse, 규칙 3g 정산)·같은 대역 스캔 묶음(scan_bundle, 정리 SQL)은
// 데이터센터 봇과 따로 '자동 열람·스캔 묶음'으로 묶고 한국어 이름을 보인다. 방문 분석 탭의 근거 규칙 3g 이름표. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("분류 사유 표: auto_browse·scan_bundle 한국어 이름과 묶음", () => {
  const cs = src("components/admin/ClassifyStats.tsx");
  assert.match(cs, /\{ key: "automation", label: "자동 열람·스캔 묶음", counted: false/);
  assert.match(cs, /auto_browse: "자동 열람\(쿠키 없이 짧은 간격 연속/);
  assert.match(cs, /scan_bundle: "같은 대역 스캔 묶음/);
  assert.match(cs, /r\.name === "auto_browse" \|\| r\.name === "scan_bundle"\)\) return \["automation", REASON\[r\.name\]\]/);
  assert.match(cs, /datacenter: 0, automation: 0, tool: 0/);           // 일별 표에도 칸이 있다
  assert.match(cs, /자동 열람 정산 대기/);
});

test("방문 분석 탭: 근거 규칙 3g 이름표", () => {
  assert.match(src("components/admin/analysisQuery.ts"), /"3g": "자동 열람\(정산\)"/);
});
