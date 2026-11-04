// T102: 관리 화면 기관 이름 — 방문 분석 탭은 API 의 화면 이름(org_label: 한국 기관은 KISA 한글 기관명)을 보이고, 저장된 영문 이름은 말풍선. `npm test`.
// 이용 추이 기관 표·방문별 열람은 API 가 이미 화면 이름(orgs.classify)을 주므로 화면 코드는 그대로다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("방문 분석: 기관 칸은 org_label(없으면 저장된 이름), 영문 원래 이름은 title", () => {
  const va = src("components/admin/VisitAnalysis.tsx");
  assert.match(va, /org_label\?: string \| null \}\)\.org_label \?\? v\.org/);
  assert.match(va, /<span title=\{v\.org \?\? undefined\}>\{orgLabel\(v\) \?\? "—"\}<\/span>/);
  assert.doesNotMatch(va, /\{v\.org \?\? "—"\}/);
});

test("이용 추이 기관 표·방문별 열람은 API 이름을 그대로 쓴다(번역 규칙 없음)", () => {
  for (const p of ["components/admin/AreaOrgStats.tsx", "components/admin/VisitPaths.tsx", "components/admin/VisitAnalysis.tsx"]) {
    assert.doesNotMatch(src(p), /Office of Education|교육청|replace\(.*Education/, p);
  }
});
