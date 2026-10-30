"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { pending, submitConsent, type Pending } from "@/lib/account";

/**
 * 가입 동의(T43) — 필수·선택을 나누고 항목마다 목적·수집 항목·보유 기간을 함께 보인다(개인정보 보호법 제22조).
 * 동의하기 전에는 서버에 아무것도 저장되지 않는다(구글에서 받은 정보는 15분짜리 서명 쿠키에만 있음).
 */
type Key = "terms" | "privacy_required" | "age14" | "usage_analysis";

const ITEMS: { key: Key; required: boolean; title: string; detail: React.ReactNode }[] = [
  {
    key: "terms",
    required: true,
    title: "이용약관 동의",
    detail: <><Link href="/terms" target="_blank" className="underline">이용약관 전문 보기</Link></>,
  },
  {
    key: "privacy_required",
    required: true,
    title: "개인정보 수집·이용 동의",
    detail: (
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5">
        <dt className="text-gray-500">목적</dt><dd>회원 식별과 로그인 유지</dd>
        <dt className="text-gray-500">항목</dt><dd>구글 계정 고유번호, 이메일, 이름, 가입·로그인·동의 일시</dd>
        <dt className="text-gray-500">보유 기간</dt><dd>탈퇴 시까지(1년 미이용 시 파기)</dd>
      </dl>
    ),
  },
  { key: "age14", required: true, title: "만 14세 이상입니다", detail: "만 14세 미만은 가입할 수 없습니다." },
  {
    key: "usage_analysis",
    required: false,
    title: "이용 기록 분석 동의",
    detail: (
      <dl className="grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-0.5">
        <dt className="text-gray-500">목적</dt><dd>서비스 개선을 위한 이용 통계</dd>
        <dt className="text-gray-500">항목</dt><dd>로그인 상태의 이용 기록(본 법령·검색어·사용 기능)을 계정과 연결</dd>
        <dt className="text-gray-500">보유 기간</dt><dd>13개월(검색어 90일). 철회하면 즉시 연결을 끊습니다</dd>
        <dd className="col-span-2 text-gray-500">동의하지 않아도 가입·이용에 제한이 없습니다.</dd>
      </dl>
    ),
  },
];

function ConsentContent() {
  const next = useSearchParams().get("next") || "/";
  const [info, setInfo] = useState<Pending | null>(null);
  const [checked, setChecked] = useState<Record<Key, boolean>>({ terms: false, privacy_required: false, age14: false, usage_analysis: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pending()
      .then(({ status, data }) => setInfo(status === 200 ? data : { pending: false }))
      .catch(() => setInfo({ pending: false }));
  }, []);

  const requiredOk = ITEMS.filter((i) => i.required).every((i) => checked[i.key]);
  const all = ITEMS.every((i) => checked[i.key]);

  async function submit() {
    setBusy(true);
    setError("");
    const { status, data } = await submitConsent(checked).catch(() => ({ status: 0, data: { error: "연결하지 못했습니다." } }));
    if (status === 200) {
      // 사이트 안쪽 경로만(백엔드도 같은 규칙)
      window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/";
      return;
    }
    setError(data?.error || "가입하지 못했습니다.");
    setBusy(false);
  }

  if (info === null) return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
  if (!info.pending) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-sm text-gray-700">
        <h1 className="text-2xl font-bold text-gray-900">동의</h1>
        <p className="mt-4">동의를 기다리는 로그인이 없거나 15분이 지나 만료됐습니다.</p>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="mt-4 inline-block font-semibold text-navy-light underline">
          다시 로그인
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">{info.existing ? "약관이 바뀌어 다시 동의를 받습니다" : "회원 가입 동의"}</h1>
      <p className="mt-2 text-sm text-gray-600">
        <strong>{info.email}</strong>
        {info.name ? ` (${info.name})` : ""} 계정으로 가입합니다. 동의하기 전에는 아무 정보도 저장되지 않습니다.
      </p>

      <label className="mt-6 flex items-center gap-3 rounded-lg border-2 border-navy-light/40 bg-navy-light/5 px-4 py-3 font-semibold text-navy">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={all}
          onChange={(e) => setChecked({ terms: e.target.checked, privacy_required: e.target.checked, age14: e.target.checked, usage_analysis: e.target.checked })}
        />
        전체 동의(선택 항목 포함)
      </label>

      <ul className="mt-3 space-y-2">
        {ITEMS.map((i) => (
          <li key={i.key} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <label className="flex items-center gap-3 text-sm font-medium text-gray-900">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={checked[i.key]}
                onChange={(e) => setChecked((c) => ({ ...c, [i.key]: e.target.checked }))}
              />
              <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${i.required ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-600"}`}>
                {i.required ? "필수" : "선택"}
              </span>
              {i.title}
            </label>
            <div className="mt-2 pl-7 text-xs leading-relaxed text-gray-600">{i.detail}</div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-gray-500">
        필수 항목에 동의하지 않으면 가입되지 않지만, 로그인 없이 모든 기능을 그대로 쓸 수 있습니다. 자세한 내용은{" "}
        <Link href="/privacy" target="_blank" className="font-semibold underline">개인정보 처리방침</Link>을 보세요.
      </p>
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!requiredOk || busy}
          className="flex-1 rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-light disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "가입 중…" : "동의하고 가입"}
        </button>
        <Link href="/" className="rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50">
          취소
        </Link>
      </div>
    </section>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <ConsentContent />
    </Suspense>
  );
}
