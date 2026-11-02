// T77: 없는 판본·없는 법령 주소 안내의 순수 함수 시험 — `npm test`(Node 22.6+ 의 TS 타입 지우기로 .ts 를 바로 읽는다)
import { test } from "node:test";
import assert from "node:assert/strict";
import { dayNumber, decodeName, isApiError, nearestVersion } from "../lib/versionMiss.ts";

test("isApiError: API 의 200 + error 응답만 오류로 본다", () => {
  assert.equal(isApiError({ error: "해당 일자의 버전이 없습니다: 민법 (2000-01-01)", available: [] }), true);
  assert.equal(isApiError({ law: { name: "민법" }, articles: [] }), false);
  assert.equal(isApiError(null), false);
  assert.equal(isApiError({ error: null }), false);
});

test("dayNumber: 연·연월·연월일, 날짜 아님·넘친 날짜는 null", () => {
  assert.equal(dayNumber("2021-01-09") - dayNumber("2021-01-01"), 8);
  assert.equal(dayNumber("2021"), dayNumber("2021-01-01"));
  assert.equal(dayNumber("2021.3"), dayNumber("2021-03-01"));
  assert.equal(dayNumber("abc"), null);
  assert.equal(dayNumber("2021-02-30"), null);
  assert.equal(dayNumber("2021-13-01"), null);
  assert.equal(dayNumber(""), null);
});

const DANG = ["2016-05-09", "2021-01-09", "2026-02-22"];

test("nearestVersion: 옛 주소 당규약 2021-01-01 → 가장 가까운 2021-01-09, 직전 2016-05-09", () => {
  assert.deepEqual(nearestVersion("2021-01-01", DANG), { nearest: "2021-01-09", before: "2016-05-09" });
});

test("nearestVersion: 모든 판본보다 이른 일자 → 첫 판본, 직전 없음", () => {
  assert.deepEqual(nearestVersion("2000-01-01", DANG), { nearest: "2016-05-09", before: null });
});

test("nearestVersion: 늦은 일자·거리 같으면 앞 판본·날짜 아님", () => {
  assert.deepEqual(nearestVersion("2030-01-01", DANG), { nearest: "2026-02-22", before: "2026-02-22" });
  assert.equal(nearestVersion("2020-01-01", ["2019-12-30", "2020-01-03"]).nearest, "2019-12-30");
  assert.deepEqual(nearestVersion("latest", DANG), { nearest: null, before: null });
  assert.deepEqual(nearestVersion("2021-01-01", []), { nearest: null, before: null });
});

test("decodeName: 인코딩된 이름·이미 풀린 이름·깨진 인코딩", () => {
  assert.equal(decodeName(encodeURIComponent("조선로동당규약")), "조선로동당규약");
  assert.equal(decodeName("형법"), "형법");
  assert.equal(decodeName("%E0%A4%A"), "%E0%A4%A");
});
