// T99: 관리 표의 경로·법령명 링크 — 링크 주소 고르기(순수 함수)와 링크 속성(새 탭·미리 받기 없음). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bare, lawHref, pageHref } from "../components/admin/pageLink.ts";

const LAW = "/law/%EB%8C%80%EC%99%B8%EA%B2%B0%EC%A0%9C%EB%B2%95";   // /law/대외결제법

test("저장된 경로는 그대로 링크(두 번 인코딩 안 함)", () => {
  assert.equal(pageHref(LAW), LAW);
  assert.equal(pageHref("/"), "/");
  assert.equal(pageHref("/compare/terms"), "/compare/terms");
  assert.equal(pageHref("/category/%ED%98%95%EC%82%AC"), "/category/%ED%98%95%EC%82%AC");
  assert.equal(pageHref("/law/형법"), "/law/형법");                 // 인코딩 안 된 채 저장된 것도 손대지 않는다
});

test("query·# 는 링크에도 글자에도 넣지 않는다", () => {
  assert.equal(pageHref("/search?q=%EB%B9%84%EB%B0%80"), "/search");
  assert.equal(pageHref(`${LAW}?version=2020-01-01#a3`), LAW);
  assert.equal(bare("/search?q=x"), "/search");
  assert.equal(bare("/law/a#b"), "/law/a");
});

test("화면이 아닌 경로·이상한 경로는 글자만(null)", () => {
  for (const p of ["/api/v1/laws", "/admin", "/_next/static/x.js", "/law-index", "/robots.txt", "/.env", "/wp-login.php",
    "//evil.example/law/x", "https://evil.example/", "javascript:alert(1)", "/\\evil", "/law/../admin", "/law/%2e%2e",
    "/%61dmin", "law/x", "/law/a b", "", null, undefined]) {
    assert.equal(pageHref(p), null, String(p));
  }
});

test("법령명 → /law/<encodeURIComponent(이름)>", () => {
  assert.equal(lawHref("대외결제법"), LAW);
  assert.equal(lawHref("조선민주주의인민공화국 헌법"), "/law/%EC%A1%B0%EC%84%A0%EB%AF%BC%EC%A3%BC%EC%A3%BC%EC%9D%98%EC%9D%B8%EB%AF%BC%EA%B3%B5%ED%99%94%EA%B5%AD%20%ED%97%8C%EB%B2%95");
  assert.equal(lawHref("a/b?c"), "/law/a%2Fb%3Fc");
  assert.equal(lawHref(""), null);
  assert.equal(lawHref(null), null);
});

test("링크는 새 탭·rel=noopener noreferrer·prefetch={false}, 관리 표는 이 링크만 쓴다", () => {
  const src = readFileSync(new URL("../components/admin/AdminLinks.tsx", import.meta.url), "utf8");
  const tags = src.match(/<Link\b[^>]*>/g) ?? [];
  assert.equal(tags.length, 2);
  for (const t of tags) {
    assert.match(t, /prefetch=\{false\}/);
    assert.match(t, /target="_blank"/);
    assert.match(t, /rel="noopener noreferrer"/);
  }
  const vp = readFileSync(new URL("../components/admin/VisitPaths.tsx", import.meta.url), "utf8");
  assert.match(vp, /<PathLink path=\{e\.path\} \/>/);
  assert.match(vp, /<LawLink name=\{e\.law\} \/>/);
  assert.doesNotMatch(vp, /<Link\b/);
  const pg = readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");
  assert.match(pg, /<LawLink name=\{l\.name\}/);
  assert.doesNotMatch(pg, /encodeURIComponent\(l\.name\)/);
  assert.doesNotMatch(pg, /qq\.query\}<\/Link>|href=\{[^}]*qq\./);   // 검색어는 링크하지 않는다
});
