// T101: 관리 화면 '방문 분석' — 질의 문자열(정해진 거르기만), 주 시작, 경로 링크(T99 방식), 내려받기는 집계만. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { aggsQuery, analysisQuery, kstDay, weekStart } from "../components/admin/analysisQuery.ts";

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("목록 질의: 기간 + 고른 거르기만(빈 값·모르는 키는 뺀다)", () => {
  assert.equal(analysisQuery("2026-11-03", "2026-11-04"), "from=2026-11-03&to=2026-11-04");
  const q = new URLSearchParams(analysisQuery("2026-11-03", "2026-11-04",
    { verdict: "human", country: "", law: "사회보험 및 사회보장법", query: "헌법" }));
  assert.deepEqual([...q.keys()], ["from", "to", "verdict", "law"]);
  assert.equal(q.get("law"), "사회보험 및 사회보장법");
});

test("집계 질의: 주 단위는 from 이 든 주의 월요일부터", () => {
  assert.equal(weekStart("2026-11-04"), "2026-11-02");
  assert.equal(weekStart("2026-11-02"), "2026-11-02");
  assert.equal(weekStart("2026-11-01"), "2026-10-26");
  assert.equal(aggsQuery("week", "2026-11-04", "2026-11-04"), "period=week&from=2026-11-02&to=2026-11-04");
  assert.equal(aggsQuery("day", "2026-11-04", "2026-11-04", "law"), "period=day&from=2026-11-04&to=2026-11-04&dim=law");
});

test("KST 날짜", () => {
  const t = Date.UTC(2026, 10, 3, 15, 30);          // 11-03 15:30Z = 11-04 00:30 KST
  assert.equal(kstDay(0, t), "2026-11-04");
  assert.equal(kstDay(6, t), "2026-10-29");
});

test("방문 분석 화면: 경로·법령은 T99 링크, 검색어 없음, 내려받기는 집계 CSV 만", () => {
  const va = src("components/admin/VisitAnalysis.tsx");
  assert.match(va, /<PathLink path=\{s\.path\} \/>/);
  assert.match(va, /<LawLink name=\{s\.law\} \/>/);
  assert.doesNotMatch(va, /<Link\b|href=\{`\/law/);
  assert.match(va, /\(검색어는 저장하지 않음\)/);
  assert.doesNotMatch(va, /\.query\b/);
  const hrefs = va.match(/href=\{[^}]*\}/g) ?? [];
  assert.deepEqual(hrefs, ["href={analysisCsvHref(aggsQuery(period, from, to))}"]);
  const acc = src("lib/account.ts");
  assert.match(acc, /analysisCsvHref = \(qs: string\) => `\$\{API\}\/api\/v1\/admin\/usage\/analysis\/aggs\.csv\?\$\{qs\}`/);
  assert.doesNotMatch(acc, /analysis\.csv|visits\.csv/);
});

test("관리 화면 탭: 이용 추이 | 방문 분석(#analysis)", () => {
  const pg = src("app/admin/page.tsx");
  assert.match(pg, /\["usage", "이용 추이"\], \["analysis", "방문 분석"\]/);
  assert.match(pg, /<VisitAnalysis \/>/);
  assert.match(pg, /#analysis/);
});
