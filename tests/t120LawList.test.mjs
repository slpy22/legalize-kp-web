// T120: /law(·/law/)에 법령 목록 — 공유된 nk-law.kr/law/ 가 404 였다. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("/law 화면이 있다: 서버에서 분야 목록을 받아 /search 와 같은 CategoryGrid 로 그린다", () => {
  assert.ok(existsSync(new URL("../app/law/page.tsx", import.meta.url)));
  const src = read("../app/law/page.tsx");
  assert.doesNotMatch(src, /^"use client"/);                                  // 서버 렌더 — 미리보기·로봇도 목록을 본다
  assert.match(src, /import CategoryGrid from "@\/components\/CategoryGrid"/);
  assert.match(src, /<CategoryGrid data=\{data\} failed=\{data === null\} \/>/);
  assert.match(src, /await fetchCategories\(\)/);                             // 있던 API(/api/v1/ref) 그대로
  assert.match(src, /<h1[^>]*>\{TITLE\}<\/h1>/);
});

test("/law 는 다른 곳으로 보내지 않고, 없는 화면(404)으로도 가지 않는다", () => {
  const src = read("../app/law/page.tsx");
  assert.doesNotMatch(src, /\b(redirect|permanentRedirect|notFound)\(/);
  assert.doesNotMatch(src, /router\.(push|replace)|location\.(href|assign|replace)/);
  const cfg = read("../next.config.ts");
  assert.doesNotMatch(cfg, /source:\s*"\/law\/?"/);                           // next.config 에 /law 이동 규칙 없음
});

test("/law 메타: 제목·설명·og·canonical 이 자기 주소", () => {
  const src = read("../app/law/page.tsx");
  assert.match(src, /const URL_LAW = "https:\/\/www\.nk-law\.kr\/law";/);
  assert.match(src, /const TITLE = "북한 법령 목록";/);
  assert.match(src, /alternates: \{ canonical: URL_LAW \}/);
  assert.match(src, /openGraph: \{[\s\S]*?title: `\$\{TITLE\} \| 북한법률정보센터`[\s\S]*?url: URL_LAW,[\s\S]*?images: \["\/opengraph-image\.png"\]/);
  assert.match(src, /description,/);
  // 얕은 병합으로 layout 값이 빠지지 않게: 사이트 이름·종류·큰 카드
  assert.match(src, /siteName: "북한법률정보센터"/);
  assert.match(src, /type: "website"/);
  assert.match(src, /twitter: \{ card: "summary_large_image"/);
  assert.doesNotMatch(src, /robots:\s*\{\s*index:\s*false/);                 // 404 안내와 달리 색인 허용
});

test("/search 의 분야별 목록은 같은 부품(CategoryGrid)을 쓴다 — 두 벌로 갈라지지 않게", () => {
  const src = read("../app/search/page.tsx");
  assert.match(src, /<CategoryGrid data=\{ref\} failed=\{failed\} \/>/);
  assert.doesNotMatch(src, /href=\{`\/category\/\$\{encodeURIComponent\(cat\.category\)\}`\}/);
  const grid = read("../components/CategoryGrid.tsx");
  assert.match(grid, /<Link\s+prefetch=\{false\}/);
  assert.match(grid, /href=\{`\/category\/\$\{encodeURIComponent\(cat\.category\)\}`\}/);
  assert.match(grid, /총 \{data\.total_laws\}건/);
  assert.match(grid, /분야 목록을 불러올 수 없습니다\./);
});

test("/law/[name]·not-found 동작은 그대로(없는 법령은 404 안내·noindex)", () => {
  const page = read("../app/law/[name]/page.tsx");
  assert.match(page, /if \(isApiError\(data\)\) return \{ title: "법령을 찾을 수 없습니다", robots: \{ index: false \} \};/);
  assert.match(page, /notFound\(\)/);
  assert.match(read("../app/law/[name]/not-found.tsx"), /return <LawMissNotice \/>;/);
});
