// T100: 검색 화면·신구비교 법령 입력에도 404 와 같은 법령명 제안(action=resolve 그대로). `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { looksLikeLawName, othersLead, pickSuggestions, shownReason } from "../lib/versionMiss.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

// 조문 내용 검색어(법령 이름이 아닌 말) — API 시험 tests/test_t100_search_suggest.py 의 CONTENT 와 같은 113개.
// 문턱값 그대로면 의미 검색(③)이 이 가운데 66개에 후보를 붙인다 → 검색 화면은 이런 말에는 resolve 자체를 묻지 않는다.
const CONTENT = ("산업 토지 소유권 재판 상속 이혼 형사책임 사형 계획 가격 은행 세금 특허 국경 군사 손해보상 계약 무역 교육 의료 "
  + "식량 농업 어업 전력 철도 관광 출입국 관세 재정 기업소 협동농장 로동시간 휴가 년금 어린이 녀성 청년 마약 밀수 채권 담보 벌금 "
  + "몰수 재산 정보화 원자력 산림 대기오염 살림집 외국인투자 선거권 저작권 로동 증권 상업 유가증권 공시서류 증권거래 보험 사회보험 "
  + "반동사상 노동시간 최저임금 해고 개인정보 집회 종교 사유재산 부동산 주식 회사설립 파산 이자 임대차 핵무기 인권 탈북 "
  + "공민증 려권 군복무 징병 위생 전염병 비상방역 손해배상 배급 장마당 시장 화페 외화 송금 자본주의 청년교양 평양문화어 "
  + "언론 출판 방송 인터네트 손전화 컴퓨터 쏘프트웨어 상표 광고 품질 표준 계량 수출 수입 합영 합작 경제개발구 특수경제지대").split(" ").concat(["공민의 권리"]);

test("조문 내용 검색어 113개는 이름 해석을 묻지 않는다 → 제안도 ③ 호출도 없다", () => {
  assert.equal(CONTENT.length, 113);
  assert.deepEqual(CONTENT.filter(looksLikeLawName), []);
});

const MASTER = new URL("../../북한법령_마스터목록.json", import.meta.url);
test("법령 368개 이름은 모두 이름 꼴(법·규약·원칙·부칙(…)·에 대하여)", { skip: !existsSync(MASTER) && "마스터목록 없음" }, () => {
  const names = JSON.parse(readFileSync(MASTER, "utf8")).laws.map((l) => l.name);
  assert.equal(names.length, 368);
  assert.deepEqual(names.filter((n) => !looksLikeLawName(n)), []);
});

test("이름 꼴 검색어: 남한 법령명·없는 이름·꾸밈·띄어쓰기", () => {
  for (const q of ["사회보험법", "근로기준법", "결혼법", "「형법」", "사회주의 헌법", "북한 형법", "노동자 보호법", "형법?", "핵무력정책에 대하여"]) {
    assert.equal(looksLikeLawName(q), true, q);
  }
  for (const q of ["", "법", "산업", "로동보호", "제5조", "사회보험법 제5조"]) assert.equal(looksLikeLawName(q), false, q);
});

test("검색: 이름이 정확히 같은 법령(exact)이 있으면 제안하지 않는다", () => {
  const r = { resolved: "형법", matched_by: "exact", candidates: [] };
  assert.deepEqual(pickSuggestions(r, "형법"), { strong: null, others: [] });
});

test("검색: 옛이름·약칭으로 해석되면 강조 1개 + 그 이유", () => {
  const r = { resolved: "조선민주주의인민공화국 헌법", matched_by: "alias", reason: "옛이름 「사회주의헌법」", candidates: [] };
  const { strong, others } = pickSuggestions(r, "사회주의헌법");
  assert.equal(strong.name, "조선민주주의인민공화국 헌법");
  assert.equal(shownReason(strong), "옛이름 「사회주의헌법」");
  assert.deepEqual(others, []);
});

test("검색 사례 F: 「사회보험법」 → '관련 있을 수 있는 법령: 「사회보험 및 사회보장법」'(강조 없음)", () => {
  const r = { resolved: null, candidates: [{ id: 1, name: "사회보험 및 사회보장법", matched_by: "semantic", confident: false, reason: "관련 있을 수 있음", score: 0.757 }] };
  const { strong, others } = pickSuggestions(r, "사회보험법");
  assert.equal(strong, null);
  assert.equal(others[0].name, "사회보험 및 사회보장법");
  assert.equal(othersLead(strong, others, "찾으시는 법령이 혹시 이 가운데 있나요? "), "이름이 같은 법령은 없습니다. 관련 있을 수 있는 법령: ");
});

test("검색: 이유가 섞이면 앞말은 '찾으시는 법령이 혹시 이 가운데 있나요?'", () => {
  const r = { resolved: null, candidates: [
    { id: 1, name: "사회주의로동법", matched_by: "same_ending", confident: false, reason: "이름 끝이 같음" },
    { id: 2, name: "로력관리법", matched_by: "semantic", confident: false, reason: "관련 있을 수 있음" }] };
  const { strong, others } = pickSuggestions(r, "노동법");
  assert.equal(othersLead(strong, others, "찾으시는 법령이 혹시 이 가운데 있나요? "), "찾으시는 법령이 혹시 이 가운데 있나요? ");
  assert.equal(othersLead(strong, others), "혹시 이 법령을 찾으셨나요? ");   // 404 화면 앞말은 그대로
});

test("검색 화면: 이름 꼴일 때만·검색어가 바뀔 때만 resolve, 결과 목록 위 상자, 검색 결과 자체는 그대로", () => {
  const src = read("../app/search/page.tsx");
  assert.match(src, /if \(!q \|\| !looksLikeLawName\(q\)\) return;/);
  assert.match(src, /fetchLawResolve\(q\)[\s\S]*?\}, \[q\]\);/);               // 쪽 넘김(page)·mode 로는 다시 묻지 않는다
  assert.match(src, /sugg\?\.q === q && <LawSuggestBox sugg=\{sugg\.s\} kind="search"/);   // 지금 검색어의 후보만
  assert.ok(src.indexOf('kind="search"') < src.indexOf("총 {total}건"));      // 결과 위
  assert.match(src, /searchLaws\(q, mode, page, 10\)/);                       // 검색 결과 요청은 그대로
});

test("신구비교: 없는 법령명이면 같은 후보, 누르면 입력이 그 법령으로 바뀌고 판본을 불러온다(자동으로 바꾸지 않음)", () => {
  const src = read("../app/diff/page.tsx");
  assert.match(src, /isApiError\(resp\)[\s\S]*?fetchLawResolve\(lawName\.trim\(\)\)/);
  assert.match(src, /kind="pick"[\s\S]*?onPick=\{\(n\) => \{\s*setName\(n\);\s*loadVersions\(n\);/);
  assert.match(src, /loadRun\.current === run && setNameSugg/);              // 늦게 온 후보가 새 입력을 덮지 않게
  assert.doesNotMatch(src, /router\.(push|replace)|redirect\(|location\.(href|assign|replace)\s*=/);
});

test("LawSuggestBox: 검색은 '찾으시는 법령이 혹시 …인가요?', 신구비교는 링크 대신 버튼", () => {
  const src = read("../components/LawSuggestBox.tsx");
  assert.match(src, /찾으시는 법령이 혹시 \{item\(strong\.name/);
  assert.match(src, /pick \? \(\s*<button type="button" onClick=\{\(\) => onPick\?\.\(name\)\}/);
  assert.match(src, /<Link prefetch=\{false\}/);
});
