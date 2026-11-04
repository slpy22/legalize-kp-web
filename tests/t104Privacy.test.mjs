// T104: 처리방침 2026-11-04 개정 — 접속 기관 판별에 역방향 DNS 조회 결과(확인된 기관의 등록 도메인만) 사용. `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../app/privacy/page.tsx", import.meta.url), "utf8");

test("수집 항목·일시 처리·개정 줄에 역DNS 기관 도메인이 적혀 있다", () => {
  assert.match(src, /접속 기관명\(통신사·기관, 예: KT·○○대학교 — 통신사 회선 안의 대학·공공기관 등은 아래 역방향 DNS 조회 결과에서 확인된 기관의 등록 도메인\(예: ○○\.ac\.kr\)만\)/);
  assert.match(src, /지역·기관은 서버 안의 판별 자료와 아래 역방향 DNS 조회 결과로 판별해 이름\(기관은 등록 도메인\)만 남김\(IP 주소는 남기지 않음\)/);
  assert.match(src, /자동 접속\(봇\) 판별과 접속 기관 판별을 위한 역방향 DNS 조회\([^)]*기관으로 확인된 경우에만 그 기관의 등록 도메인을 남김 — 조회한 이름 전체와 IP 주소는 저장하지 않음\)/);
  assert.match(src, /2026-11-04 개정\([^)]*접속 기관 판별에 역방향 DNS 조회 결과 사용\)/);
});

test("옛 문구(결과 저장하지 않음·외부로 보내지 않음)는 남아 있지 않다", () => {
  assert.doesNotMatch(src, /결과는 판별에만 쓰고 저장하지 않음\)/);
  assert.doesNotMatch(src, /바로 판별해 이름만 남김\(외부로 보내지 않음\)/);
});
