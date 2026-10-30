"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { logout, me, setUsageAnalysis, withdraw, type Me } from "@/lib/account";

const ITEM_LABEL: Record<string, string> = {
  terms: "이용약관(필수)",
  privacy_required: "개인정보 수집·이용(필수)",
  age14: "만 14세 이상(필수)",
  usage_analysis: "이용 기록 분석(선택)",
};

const fmt = (iso?: string) => (iso ? iso.slice(0, 16).replace("T", " ") : "-");

/** 내 계정(T43) — 내 정보·동의 현황, 선택 동의 켜고 끄기, 로그아웃, 회원 탈퇴(즉시 삭제) */
export default function AccountPage() {
  const [state, setState] = useState<Me | null>(null);
  const [msg, setMsg] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await me().catch(() => ({ data: { user: null } as Me }));
    setState(data);
  }
  useEffect(() => {
    me()
      .then(({ data }) => setState(data))
      .catch(() => setState({ user: null }));
  }, []);

  if (state === null) return <div className="py-20 text-center text-gray-500">로딩 중...</div>;
  if (!state.user) {
    return (
      <section className="mx-auto max-w-md px-4 py-12 text-sm text-gray-700">
        <h1 className="text-2xl font-bold text-gray-900">내 계정</h1>
        <p className="mt-4">로그인하지 않았습니다. 로그인 없이도 모든 기능을 쓸 수 있습니다.</p>
        <Link href="/login?next=/account" className="mt-4 inline-block font-semibold text-navy-light underline">로그인</Link>
      </section>
    );
  }

  const u = state.user;
  const optIn = Boolean(state.consents?.usage_analysis?.agreed);

  async function toggle() {
    setBusy(true);
    const { data } = await setUsageAnalysis(!optIn);
    setMsg(
      data?.ok
        ? !optIn
          ? "이용 기록 분석에 동의했습니다. 앞으로의 이용 기록이 계정과 연결됩니다."
          : `이용 기록 분석 동의를 철회했습니다. 계정과 연결된 기록 ${data.unlinked_events ?? 0}건의 연결을 끊었습니다.`
        : data?.error || "바꾸지 못했습니다.",
    );
    await load();
    setBusy(false);
  }

  async function doLogout() {
    await logout();
    window.location.href = "/";
  }

  async function doWithdraw() {
    setBusy(true);
    const { data } = await withdraw();
    if (data?.deleted) {
      window.location.href = "/?withdrawn=1";
      return;
    }
    setMsg(data?.error || "탈퇴하지 못했습니다.");
    setBusy(false);
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">내 계정</h1>

      <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 rounded-xl border border-gray-200 bg-white p-5 text-sm shadow-sm">
        <dt className="text-gray-500">이메일</dt><dd className="font-medium text-gray-900">{u.email}</dd>
        <dt className="text-gray-500">이름</dt><dd>{u.name || "-"}</dd>
        <dt className="text-gray-500">가입</dt><dd className="tabular-nums">{fmt(u.created_at)}</dd>
        <dt className="text-gray-500">마지막 로그인</dt><dd className="tabular-nums">{fmt(u.last_login_at)}</dd>
      </dl>

      <h2 className="mt-8 text-lg font-bold text-gray-900">동의 현황</h2>
      <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white text-sm">
        {Object.entries(ITEM_LABEL).map(([k, label]) => {
          const c = state.consents?.[k];
          return (
            <li key={k} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span>{label}</span>
              <span className={`text-xs ${c?.agreed ? "text-emerald-700" : "text-gray-400"}`}>
                {c ? `${c.agreed ? "동의" : "미동의"} · ${fmt(c.at)} · ${c.version}` : "기록 없음"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="rounded-lg border border-navy-light px-4 py-2 text-sm font-medium text-navy-light transition-colors hover:bg-navy-light hover:text-white disabled:opacity-50"
        >
          {optIn ? "이용 기록 분석 동의 철회" : "이용 기록 분석에 동의"}
        </button>
        <span className="text-xs text-gray-500">선택 항목이라 언제든 바꿀 수 있습니다.</span>
      </div>
      {msg && <p className="mt-3 rounded-lg bg-navy-light/5 px-4 py-2 text-sm text-navy" role="status">{msg}</p>}

      <div className="mt-10 flex flex-wrap gap-2 border-t border-gray-200 pt-6">
        <button type="button" onClick={doLogout} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          로그아웃
        </button>
        {!confirming ? (
          <button type="button" onClick={() => setConfirming(true)} className="rounded-lg px-4 py-2 text-sm text-rose-700 hover:bg-rose-50">
            회원 탈퇴
          </button>
        ) : (
          <div className="w-full rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>탈퇴하면 회원 정보와 동의 기록이 <strong>즉시 삭제</strong>되고 복구할 수 없습니다. 그동안의 이용 기록은 계정과의 연결만 끊겨 익명 통계로 남습니다.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={doWithdraw} disabled={busy} className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                탈퇴하고 삭제
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-rose-700">
                취소
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-xs text-gray-500">
        <Link href="/privacy" className="font-semibold underline">개인정보 처리방침</Link> · <Link href="/terms" className="underline">이용약관</Link>
      </p>
    </section>
  );
}
