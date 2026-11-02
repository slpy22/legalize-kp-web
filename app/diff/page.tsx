"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { fetchLawVersions, fetchDiffSemantic, fetchDiffReport } from "@/lib/api";
import type {
  LawVersionMeta,
  SemanticDiffData,
  DiffKind,
  DiffReportData,
} from "@/lib/types";
import SideBySideDiff from "@/components/SideBySideDiff";
import LawNameInput, { useLawIndex } from "@/components/LawNameInput";
import { DIFF_QUICK_PICKS, diffHref } from "@/lib/showcase";
import { track } from "@/lib/track";
import { isApiError, nearestVersion } from "@/lib/versionMiss";

function DiffContent() {
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") || "";
  // T42: ?date1=&date2= 가 함께 오면 판본을 불러온 뒤 바로 비교한다(홈·대표 비교 바로가기)
  const qDate1 = searchParams.get("date1") || "";
  const qDate2 = searchParams.get("date2") || "";

  const [name, setName] = useState(initialName);
  const lawIndex = useLawIndex();   // T54: 본문 미확보 여부
  const [versions, setVersions] = useState<LawVersionMeta[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [diff, setDiff] = useState<SemanticDiffData | null>(null);
  const [showSame, setShowSame] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateNotice, setDateNotice] = useState("");   // T77: 주소의 판본 일자가 없을 때 안내
  const [report, setReport] = useState<DiffReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  // T74: 리포트는 서버가 백그라운드로 만든다(1~2분). 진행 중이면 몇 초마다 같은 요청을 다시 보낸다.
  const [reportError, setReportError] = useState("");
  const [reportStarted, setReportStarted] = useState(0);   // 화면에서 기다리기 시작한 시각(ms)
  const [retryAt, setRetryAt] = useState(0);               // 실패 뒤 다시 시도할 수 있는 시각(ms)
  const [now, setNow] = useState(() => Date.now());
  const reportRun = useRef(0);                             // 바뀌면 이전 다시 묻기를 멈춘다

  function stopReport() {
    reportRun.current += 1;
    setReport(null);
    setReportLoading(false);
    setReportError("");
    setRetryAt(0);
  }

  // 화면을 떠나면 다시 묻기를 멈춘다(서버의 생성은 계속되고 저장된다)
  useEffect(() => () => { reportRun.current += 1; }, []);

  // 기다리는 동안·다시 시도 대기 동안 1초마다 경과 시간을 갱신
  useEffect(() => {
    if (!reportLoading && retryAt <= Date.now()) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (!reportLoading && n >= retryAt) clearInterval(t);   // 다시 시도 대기가 끝나면 멈춘다
    }, 1000);
    return () => clearInterval(t);
  }, [reportLoading, retryAt]);

  async function loadVersions(lawName = name, want1 = "", want2 = "") {
    if (!lawName.trim()) return;
    setError("");
    setDateNotice("");
    setLoaded(false);
    setVersions([]);
    setDiff(null);
    stopReport();
    try {
      const resp = await fetchLawVersions(lawName.trim());
      // T77: 없는 법령은 API 가 200 + error 로 답한다 — '판본 2건 미만'이 아니라 법령이 없다고 알린다
      if (isApiError(resp)) {
        setError(`‘${lawName.trim()}’ 법령을 찾을 수 없습니다. 법령명을 다시 확인해 주세요.`);
        return;
      }
      const vs = resp.versions || [];
      setVersions(vs);
      setLoaded(true);
      if (vs.length >= 2) {
        const sorted = [...vs].sort((a, b) =>
          (a.version_date || "").localeCompare(b.version_date || "")
        );
        const has = (d: string) => sorted.some((v) => v.version_date === d);
        const dates = sorted.map((v) => v.version_date);
        // 주소로 받은 시점이 보유 판본이면 그대로, 없는 일자면 가장 가까운 판본(T77), 주소에 없으면 처음·마지막 판본
        const pick = (want: string, dflt: string) => (!want || has(want) ? (want || dflt) : (nearestVersion(want, dates).nearest ?? dflt));
        const d1 = pick(want1, sorted[0].version_date);
        const d2 = pick(want2, sorted[sorted.length - 1].version_date);
        const missing = [want1, want2].filter((w) => w && !has(w));
        if (missing.length) {
          setDateNotice(`주소의 판본 일자 ${missing.join("·")} 은(는) 이 법령에 없습니다. 가장 가까운 판본(${d1} → ${d2})을 골라 두었으니 확인한 뒤 비교해 주세요.`);
        }
        setDate1(d1);
        setDate2(d2);
        if (has(want1) && has(want2) && want1 !== want2) await runDiff(lawName, want1, want2);
      }
    } catch {
      setError("법령 정보를 불러올 수 없습니다.");
    }
  }

  // 주소(name·date1·date2)가 바뀔 때마다 — 같은 페이지 안의 대표 비교 바로가기도 여기로 온다
  useEffect(() => {
    if (!initialName) return;
    setName(initialName);
    loadVersions(initialName, qDate1, qDate2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialName, qDate1, qDate2]);

  async function runDiff(lawName = name, d1 = date1, d2 = date2) {
    if (!d1 || !d2 || d1 === d2) return;
    setLoading(true);
    setError("");
    setDiff(null);
    stopReport();
    try {
      const d = await fetchDiffSemantic(lawName.trim(), d1, d2);
      setDiff(d);
      track("diff", { law: d.law_name }); // T43 이용 기록(익명)
    } catch {
      setError("비교 결과를 가져올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function runReport() {
    // 화면에 보이는 비교 결과의 법령·두 시점으로 만든다(선택 상자를 바꿔도 결과와 어긋나지 않게)
    const lawName = diff?.law_name || name.trim();
    const d1 = diff?.from.version_date || date1;
    const d2 = diff?.to.version_date || date2;
    if (!lawName || !d1 || !d2 || d1 === d2) return;
    const run = ++reportRun.current;
    const alive = () => reportRun.current === run;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setReport(null);
    setReportError("");
    setRetryAt(0);
    setReportLoading(true);
    setReportStarted(Date.now());
    setNow(Date.now());
    const giveUpAt = Date.now() + 8 * 60 * 1000;   // 서버 생성 상한(6분)보다 넉넉히
    let netFails = 0;
    while (alive()) {
      let r: DiffReportData;
      try {
        r = await fetchDiffReport(lawName, d1, d2);
        netFails = 0;
      } catch (e) {
        // 잠깐의 연결 끊김(배포·재시작)은 몇 번 더 묻는다
        if (++netFails >= 3) {
          const code = /API (\d+)/.exec(String(e))?.[1];
          setReportError(`리포트 상태를 확인하지 못했습니다${code ? `(서버 응답 ${code})` : "(연결 실패)"}. 잠시 뒤 다시 시도해 주세요.`);
          break;
        }
        await sleep(5000);
        continue;
      }
      if (!alive()) return;
      if (r.error) {
        setReportError(r.error);
        break;
      }
      if (r.status === "pending") {
        if (Date.now() > giveUpAt) {
          setReportError("리포트가 너무 오래 걸립니다. 잠시 뒤 다시 시도해 주세요(서버에서 다 만들어지면 바로 보입니다).");
          break;
        }
        await sleep(Math.max(1, r.poll_after_sec ?? 3) * 1000);
        continue;
      }
      if (r.status === "failed") {
        setReportError(r.message || "리포트를 만들지 못했습니다.");
        const t = Date.now();
        setNow(t);   // 남은 초가 서버 값(retry_after_sec)과 같게 보이도록 같은 시각 기준
        setRetryAt(t + (r.retry_after_sec ?? 0) * 1000);
        break;
      }
      setReport(r);   // done(또는 status 없는 예전 응답)
      break;
    }
    if (alive()) setReportLoading(false);
  }

  const elapsed = Math.max(0, Math.floor((now - reportStarted) / 1000));
  const elapsedText = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const retryLeft = Math.max(0, Math.ceil((retryAt - now) / 1000));

  const sortedVersions = useMemo(
    () =>
      [...versions].sort((a, b) =>
        (a.version_date || "").localeCompare(b.version_date || "")
      ),
    [versions]
  );
  // T76: 출처는 코드(mobu·center_input …)가 아니라 사람이 읽는 이름(provenance.label)으로 보인다
  const srcLabel = (date: string | undefined, code: string | null | undefined) => {
    const v = versions.find((x) => x.version_date === date);
    const label = v?.provenance?.label ?? v?.source_desc?.label ?? code;
    return label ? ` [${label}]` : "";
  };

  // 표시 순서: 변경 → 신설 → 삭제 → (동일)
  const orderedPairs = useMemo(() => {
    if (!diff) return [];
    const order: Record<DiffKind, number> = {
      modified: 0,
      added: 1,
      removed: 2,
      same: 3,
    };
    return [...diff.pairs]
      .filter((p) => showSame || p.kind !== "same")
      .sort((a, b) => order[a.kind] - order[b.kind]);
  }, [diff, showSame]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-navy-light">
          홈
        </Link>
        <span className="mx-2">/</span>
        {(() => {
          // 선택(불러오기 완료 또는 비교 결과)된 법률명 — 정식 명칭 우선
          const crumb = diff?.law_name || (loaded ? name.trim() : "");
          if (!crumb) return null;
          return (
            <>
              <Link
                href={`/law/${encodeURIComponent(crumb)}`}
                className="hover:text-navy-light"
              >
                {crumb}
              </Link>
              <span className="mx-2">/</span>
            </>
          );
        })()}
        <span className="font-medium text-gray-800">신구비교</span>
      </nav>

      <h1 className="mb-1 text-2xl font-bold text-gray-800">신구비교</h1>
      <p className="mb-6 text-sm text-gray-500">
        두 판본의 조문을 의미(임베딩 유사도)로 짝지어 신설·삭제·변경을 찾고, 변경된 조항은 좌우 본문에서 달라진 부분을 강조합니다.
        결과에서 AI 변화 리포트도 만들 수 있습니다.
      </p>

      {/* 법령명 입력 — T50: 자동완성(부분 일치·별칭·초성), 고르면 바로 판본을 불러온다 */}
      <div className="mb-6 flex gap-2">
        <LawNameInput
          value={name}
          onChange={setName}
          onSelect={(n) => loadVersions(n)}
          onEnter={() => loadVersions()}
          label="비교할 법령명"
          placeholder="법령명 (예: 헌법, 형법, ㅎㅂ)"
          className="flex-1"
          inputClassName="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-navy-light focus:outline-none focus:ring-2 focus:ring-navy-light/30"
        />
        <button
          onClick={() => loadVersions()}
          className="shrink-0 rounded-lg bg-navy-light px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy"
        >
          버전 불러오기
        </button>
      </div>

      {/* 시점 선택 */}
      {loaded && versions.length >= 2 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">이전 시점</label>
              <select
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {sortedVersions.map((v) => (
                  <option key={`f-${v.id}`} value={v.version_date}>
                    {v.version_date}
                    {srcLabel(v.version_date, v.source)}
                  </option>
                ))}
              </select>
            </div>
            <span className="pb-2 text-gray-400">&rarr;</span>
            <div>
              <label className="mb-1 block text-sm text-gray-600">새 시점</label>
              <select
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
              >
                {sortedVersions.map((v) => (
                  <option key={`t-${v.id}`} value={v.version_date}>
                    {v.version_date}
                    {srcLabel(v.version_date, v.source)}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => runDiff()}
              disabled={loading || date1 === date2}
              className="rounded-lg bg-accent px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "비교 중..." : "의미 기반 비교"}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            * 본문이 적재된 버전만 비교할 수 있습니다.
          </p>
        </div>
      )}

      {/* 빈 첫 화면(T42): 사용법과 대표 비교 바로가기 */}
      {!initialName && !loaded && !diff && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <ol className="flex flex-col gap-2 text-sm text-gray-700 sm:flex-row sm:flex-wrap sm:gap-x-6">
            <li><span className="mr-1.5 font-bold text-navy-light">1</span>법령 선택</li>
            <li><span className="mr-1.5 font-bold text-navy-light">2</span>비교할 두 시점 선택</li>
            <li><span className="mr-1.5 font-bold text-navy-light">3</span>의미 기반 비교</li>
            <li><span className="mr-1.5 font-bold text-navy-light">4</span>(선택) AI 변화 리포트</li>
          </ol>
          <p className="mt-4 text-sm font-semibold text-gray-800">대표 비교 — 누르면 바로 결과가 나옵니다</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIFF_QUICK_PICKS.map((q) => (
              <Link
                key={q.label}
                href={diffHref(q.name, q.date1, q.date2)}
                className="rounded-full border border-navy-light/40 bg-navy-light/5 px-3.5 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy-light hover:text-white"
              >
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {loaded && versions.length < 2 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {/* T54: 본문 미확보 법령은 판본 자체가 없다 */}
          {lawIndex.find((e) => e.n === name.trim())?.t
            ? <>본문 미확보 법령이라 비교할 판본이 없습니다. <Link href={`/law/${encodeURIComponent(name.trim())}/history`} className="underline">알려진 개정 이력 보기</Link></>
            : "본문이 적재된 버전이 2건 미만이라 비교할 수 없습니다."}
        </p>
      )}

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
      {dateNotice && !diff && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">{dateNotice}</p>
      )}
      {loading && (
        <p className="mb-4 rounded-lg bg-navy-light/5 px-4 py-3 text-sm text-navy" role="status">
          두 판본을 의미로 짝짓는 중입니다… (조문 수에 따라 몇 초 걸릴 수 있습니다)
        </p>
      )}

      {/* 결과 */}
      {diff && (
        <div className="space-y-4">
          {/* 요약 헤더 */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800">{diff.law_name}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {diff.from.version_date}
              {srcLabel(diff.from.version_date, diff.from.source)} {" → "}
              {diff.to.version_date}
              {srcLabel(diff.to.version_date, diff.to.source)}
              {diff.method === "semantic" ? " · 의미 매칭" : " · 조문번호 매칭"}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
                변경 {diff.summary.modified}
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">
                신설 {diff.summary.added}
              </span>
              <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-800">
                삭제 {diff.summary.removed}
              </span>
              <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">
                동일 {diff.summary.same}
              </span>
            </div>
            {diff.summary.same > 0 && (
              <label className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showSame}
                  onChange={(e) => setShowSame(e.target.checked)}
                />
                변경 없는 조문도 표시 ({diff.summary.same}개)
              </label>
            )}
            <div className="mt-4 border-t border-gray-100 pt-3">
              <button
                onClick={runReport}
                disabled={reportLoading || retryLeft > 0}
                className="rounded-lg bg-navy px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:opacity-50"
              >
                {reportLoading
                  ? "리포트 생성 중…"
                  : reportError
                    ? (retryLeft > 0 ? `다시 시도 (${retryLeft}초 뒤)` : "다시 시도")
                    : "📄 의미론적 변화 리포트 생성"}
              </button>
              <span className="ml-2 text-xs text-gray-500">
                변경·신설·삭제를 영역별로 종합 분석합니다 · 처음 만들 때는 1~2분 걸릴 수 있습니다
              </span>
              {reportLoading && (
                <div className="mt-3 rounded-lg bg-navy-light/5 px-4 py-3 text-sm text-navy" role="status" aria-live="polite">
                  <p>
                    AI 변화 리포트를 만드는 중입니다… <span className="tabular-nums">{elapsedText}</span> 경과
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-light/15" aria-hidden="true">
                    <div
                      className="h-full rounded-full bg-navy-light transition-[width] duration-1000 ease-linear"
                      style={{ width: `${Math.min(95, Math.round((elapsed / 120) * 100))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    1~2분 걸릴 수 있습니다. 만든 리포트는 저장되어, 이 화면을 떠났다가 다시 눌러도 이어서 받습니다.
                  </p>
                </div>
              )}
              {reportError && !reportLoading && (
                <p className="mt-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                  {reportError}
                </p>
              )}
            </div>
          </div>

          {/* 의미론적 변화 리포트 */}
          {report && report.report && (
            <div className="rounded-lg border border-navy-light/30 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3">
                <h2 className="text-lg font-bold text-navy">변화 리포트</h2>
                <span className="text-xs text-gray-500">
                  {report.from.version_date} → {report.to.version_date} · AI 종합 분석
                  {report.generated_at ? ` · ${report.generated_at.slice(0, 16)} 작성` : ""}
                </span>
              </div>
              <article className="prose prose-sm max-w-none prose-headings:text-navy prose-h2:mt-5 prose-h2:text-base prose-strong:text-gray-900">
                <ReactMarkdown>{report.report}</ReactMarkdown>
              </article>
              <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">
                * 이 리포트는 조문 변화 데이터를 AI가 의미론적으로 종합한 것으로, 참고용입니다. 정확한 내용은 원문 조항을 확인하세요.
              </p>
            </div>
          )}

          {/* 좌우 비교 카드 목록 */}
          <div className="space-y-3">
            {orderedPairs.map((p, i) => (
              <SideBySideDiff
                key={`${p.kind}-${p.from?.article_number ?? ""}-${p.to?.article_number ?? ""}-${i}`}
                pair={p}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default function DiffPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-500">로딩 중...</div>
      }
    >
      <DiffContent />
    </Suspense>
  );
}
