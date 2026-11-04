// T97: 없는 법령 주소 안내의 '혹시 「…」을 찾으셨나요?' — 이름 해석(action=resolve) 응답에서 후보를 고르는 순수 함수. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { objectParticle, pickSuggestions } from "../lib/versionMiss.ts";

const CONST = "조선민주주의인민공화국 헌법";

test("헌법 사례: 확실한 1개를 strong 으로", () => {
  const r = { input: "조선민주의인민공화국 헌법", resolved: null, law_id: null, matched_by: null, hint: "…",
    candidates: [{ id: 136, name: CONST, matched_by: "typo", confident: true }] };
  assert.deepEqual(pickSuggestions(r, "조선민주의인민공화국 헌법"), { strong: { name: CONST, matched_by: "typo" }, others: [] });
});

test("확실한 것이 없으면 others 만(최대 3개), 확실한 것이 뒤에 있어도 strong 은 1개", () => {
  const many = { resolved: null, candidates: ["사회주의로동법", "외국인투자기업로동법", "가", "나"].map((name, i) => ({ id: i, name, matched_by: "same_ending" })) };
  const got = pickSuggestions(many, "노동법");
  assert.equal(got.strong, null);
  assert.deepEqual(got.others.map((c) => c.name), ["사회주의로동법", "외국인투자기업로동법", "가"]);
  const mixed = { resolved: null, candidates: [
    { id: 1, name: "가법", matched_by: "short" }, { id: 2, name: "나법", matched_by: "typo", confident: true }, { id: 3, name: "다법", matched_by: "typo", confident: true }] };
  const m = pickSuggestions(mixed, "x");
  assert.equal(m.strong.name, "나법");
  assert.deepEqual(m.others.map((c) => c.name), ["가법", "다법"]);
});

test("후보 없음·오류·같은 이름은 아무것도 보이지 않는다(지금 화면 그대로)", () => {
  assert.deepEqual(pickSuggestions({ resolved: null, candidates: [] }, "우주여행관리법"), { strong: null, others: [] });
  assert.deepEqual(pickSuggestions({ error: "name parameter required" }, "x"), { strong: null, others: [] });
  assert.deepEqual(pickSuggestions(null, "x"), { strong: null, others: [] });
  assert.deepEqual(pickSuggestions({ resolved: null, candidates: [{ id: 1, name: "x", matched_by: "short" }] }, "x"), { strong: null, others: [] });
});

test("resolved 가 오면(드묾) 그것을 strong 으로", () => {
  assert.equal(pickSuggestions({ resolved: "형법", matched_by: "normalized", candidates: [] }, "형 법").strong.name, "형법");
});

test("목적격 조사", () => {
  assert.equal(objectParticle(CONST), "을");
  assert.equal(objectParticle("조선로동당규약"), "을");
  assert.equal(objectParticle("핵무력정책에 대하여"), "를");
  assert.equal(objectParticle("ABC"), "을(를)");
});

test("LawMissNotice: 후보는 '법령 없음' 갈래에서만 불러오고, 링크는 미리 받지 않으며 자동 이동하지 않는다", () => {
  const src = readFileSync(new URL("../components/LawMissNotice.tsx", import.meta.url), "utf8");
  assert.match(src, /if \(!name \|\| versions !== null\) return;/);          // versions === null(법령 없음)일 때만 resolve
  assert.match(src, /versions === null && hasSugg/);
  assert.doesNotMatch(src, /router\.(push|replace)|redirect\(|location\.(href|assign|replace)\s*=/);
  assert.match(src, /찾으셨나요\?/);
});

test("404 화면은 noindex·HTTP 404 그대로(page 가 notFound, generateMetadata 가 index:false)", () => {
  const page = readFileSync(new URL("../app/law/[name]/page.tsx", import.meta.url), "utf8");
  assert.match(page, /robots: \{ index: false \}/);
  assert.match(page, /notFound\(\)/);
});

test("사람이 누르는 링크는 /law-index(자동완성용 JSON)로 가지 않는다 — 법령 목록 화면은 /search", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("..", import.meta.url));
  const walk = (d, out = []) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (/\.(tsx|jsx)$/.test(n)) out.push(p);
    }
    return out;
  };
  const hits = ["app", "components"].flatMap((d) => walk(join(root, d)))
    .filter((p) => /href=\{?["'`]\/law-index/.test(readFileSync(p, "utf8")));
  assert.deepEqual(hits, []);
  const miss = readFileSync(new URL("../components/LawMissNotice.tsx", import.meta.url), "utf8");
  const nf = readFileSync(new URL("../app/not-found.tsx", import.meta.url), "utf8");
  assert.match(miss, /href="\/search"/);
  assert.match(nf, /href="\/search"/);
});
