// T94: 화면 안 링크의 Next 미리 받기(?_rsc=)를 끈다 — 화면 하나를 열 때 링크 수만큼 RSC 요청이 나가
// 사람 1분 최대 162건(nginx 화면 속도 제한을 RSC 에 낮게 걸 수 없었음). 머리말 상단 메뉴·로고만 마우스를 올리거나 손가락을
// 댈 때 미리 받는다(components/IntentLink.tsx). 나머지는 모두 prefetch={false}.
// 새 <Link> 를 넣을 때 prefetch 를 빠뜨리면 이 시험이 알린다. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// 이용통계 담당 파일(손대지 않음 — '/' 링크 1개) / 마우스·손가락을 댈 때만 미리 받는 머리말용 링크
const ALLOW = new Set(["app/privacy/page.tsx", "components/IntentLink.tsx"]);
const SKIP_DIRS = ["app/admin/", "components/admin/"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(name)) out.push(p);
  }
  return out;
}

// 주석 안의 '<Link>' 는 세지 않는다(줄 번호가 맞게 줄바꿈은 남긴다)
const blank = (s) => s.replace(/[^\n]/g, " ");
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, pre) => pre + blank(m.slice(pre.length)));

function linkTags(raw) {
  // '<Link' 부터 태그를 닫는 '>' 까지(속성 안 '=>' 는 건너뜀)
  const src = stripComments(raw);
  const tags = [];
  const re = /<Link(?=[\s>])/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + 5, depth = 0;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    tags.push({ line: src.slice(0, m.index).split("\n").length, tag: src.slice(m.index, i + 1) });
  }
  return tags;
}

const files = ["app", "components", "lib"].flatMap((d) => walk(join(ROOT, d)))
  .map((p) => ({ p, rel: relative(ROOT, p).split(sep).join("/") }))
  .filter(({ rel }) => !SKIP_DIRS.some((d) => rel.startsWith(d)));

test("화면 안 <Link> 는 모두 prefetch 를 정해 둔다", () => {
  const missing = [];
  for (const { p, rel } of files) {
    if (ALLOW.has(rel)) continue;
    for (const { line, tag } of linkTags(readFileSync(p, "utf8"))) {
      if (!/\bprefetch=/.test(tag)) missing.push(`${rel}:${line}`);
    }
  }
  assert.deepEqual(missing, [], "prefetch={false} 가 없는 <Link>: " + missing.join(", "));
});

test("prefetch 를 켜는 링크(true·auto·null)는 IntentLink 밖에 없다", () => {
  const on = [];
  for (const { p, rel } of files) {
    if (ALLOW.has(rel)) continue;
    for (const { line, tag } of linkTags(readFileSync(p, "utf8"))) {
      const m = tag.match(/\bprefetch=\{([^}]*)\}/);
      if (m && m[1].trim() !== "false") on.push(`${rel}:${line} prefetch={${m[1]}}`);
    }
  }
  assert.deepEqual(on, []);
});

test("머리말: 상단 메뉴 5개·로고는 IntentLink(댈 때만 미리 받기), 모바일 메뉴는 prefetch={false}", () => {
  const src = readFileSync(join(ROOT, "components/Header.tsx"), "utf8");
  const nav = src.match(/const NAV: NavItem\[\] = \[([\s\S]*?)\];/)[1];
  assert.equal((nav.match(/kind: "link"/g) || []).length, 5);
  assert.equal((src.match(/<IntentLink(?=[\s>])/g) || []).length, 2, "로고 1 + 데스크톱 메뉴 map 1");
  const intent = readFileSync(join(ROOT, "components/IntentLink.tsx"), "utf8");
  assert.match(intent, /prefetch=\{intent \? null : false\}/);
  assert.match(intent, /onMouseEnter=/);
  assert.match(intent, /onTouchStart=/);
});

test("화면 코드에 router.prefetch 호출이 없다", () => {
  const hits = files.filter(({ p }) => /\.prefetch\(/.test(readFileSync(p, "utf8"))).map(({ rel }) => rel);
  assert.deepEqual(hits, []);
});
