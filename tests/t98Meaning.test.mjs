// T98: 없는 법령 주소 안내 — 의미로 유추한 후보(① 옛이름 ② 남한 대응 ③ 관련 있을 수 있음)의 이유 표시. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { othersLead, pickSuggestions, sharedReason, shownReason } from "../lib/versionMiss.ts";

const CONST = "조선민주주의인민공화국 헌법";

test("① 옛이름: 강조 1개 + 이유 '옛이름 「사회주의헌법」'", () => {
  const r = { resolved: null, candidates: [{ id: 1, name: CONST, matched_by: "former_name", confident: true, reason: "옛이름 「사회주의헌법」" }] };
  const { strong, others } = pickSuggestions(r, "사회주의 헌법");
  assert.equal(strong.name, CONST);
  assert.equal(shownReason(strong), "옛이름 「사회주의헌법」");
  assert.deepEqual(others, []);
});

test("② 남한 대응: 강조 없이, 이유가 모두 같으면 앞말에 한 번만", () => {
  const reason = "남한 「근로기준법」에 대응";
  const r = { resolved: null, candidates: ["로동보호법", "로동보수법", "사회주의로동법"].map((name, i) => ({ id: i, name, matched_by: "kr_mapping", confident: false, reason })) };
  const { strong, others } = pickSuggestions(r, "근로기준법");
  assert.equal(strong, null);
  assert.deepEqual(others.map(shownReason), [reason, reason, reason]);
  assert.equal(sharedReason(others), reason);
  assert.equal(othersLead(strong, others), "이름이 같은 북한 법령은 없습니다. 남한 「근로기준법」에 대응하는 법령: ");
});

test("③ 의미 후보만이면 앞말이 '관련 있을 수 있는 법령'", () => {
  const r = { resolved: null, candidates: [{ id: 1, name: "가족법", matched_by: "semantic", confident: false, reason: "관련 있을 수 있음", score: 0.70 }] };
  const { strong, others } = pickSuggestions(r, "결혼법");
  assert.equal(strong, null);
  assert.equal(shownReason(others[0]), "관련 있을 수 있음");
  assert.match(othersLead(strong, others), /관련 있을 수 있는 법령/);
});

test("이유가 섞이면 앞말은 '혹시 이 법령을 찾으셨나요?'이고 항목마다 이유", () => {
  const r = { resolved: null, candidates: [
    { id: 1, name: "로동보호법", matched_by: "typo", confident: false, reason: "이름이 비슷함" },
    { id: 2, name: "아동권리보장법", matched_by: "semantic", confident: false, reason: "관련 있을 수 있음" }] };
  const { strong, others } = pickSuggestions(r, "아동보호법");
  assert.equal(sharedReason(others), null);
  assert.equal(othersLead(strong, others), "혹시 이 법령을 찾으셨나요? ");
  assert.deepEqual(others.map(shownReason), [null, "관련 있을 수 있음"]);
});

test("이름이 비슷한 후보(오타·두음)는 이유를 따로 적지 않는다", () => {
  assert.equal(shownReason({ name: "형법", matched_by: "typo", reason: "이름이 비슷함" }), null);
  assert.equal(shownReason({ name: "로동보호법", matched_by: "dueum", reason: "두음 표기 차이" }), null);
});

test("의미 후보는 확실 표시가 와도 강조되지 않게 API 가 보내지 않는다 — 화면은 confident 만 본다", () => {
  const r = { resolved: null, candidates: [{ id: 1, name: "가족법", matched_by: "semantic", confident: false, reason: "관련 있을 수 있음" },
    { id: 2, name: "상속법", matched_by: "semantic", confident: false, reason: "관련 있을 수 있음" }] };
  assert.equal(pickSuggestions(r, "이혼법").strong, null);
});

test("LawMissNotice: 이유를 그리고, 자동 이동은 없다", () => {
  const src = readFileSync(new URL("../components/LawMissNotice.tsx", import.meta.url), "utf8");
  assert.match(src, /shownReason\(c\)/);
  assert.match(src, /shownReason\(sugg\.strong\)/);
  assert.match(src, /othersLead\(sugg\.strong, sugg\.others\)/);
  assert.doesNotMatch(src, /router\.(push|replace)|redirect\(|location\.(href|assign|replace)\s*=/);
});
