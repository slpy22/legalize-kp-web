"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authConfig, loginHref } from "@/lib/account";

const ERRORS: Record<string, string> = {
  unavailable: "로그인 기능이 아직 준비되지 않았습니다. 로그인 없이 모든 기능을 그대로 쓸 수 있습니다.",
  denied: "구글 로그인을 취소했습니다.",
  state: "로그인 요청이 만료됐거나 올바르지 않습니다. 다시 시도해 주세요.",
  google: "구글에서 계정 정보를 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
};

/** 로그인(선택, T43) — 구글 계정으로만 */
function LoginContent() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const error = params.get("error");
  const [ready, setReady] = useState<boolean | null>(null);

  useEffect(() => {
    authConfig()
      .then(({ data }) => setReady(Boolean(data?.login)))
      .catch(() => setReady(false));
  }, []);

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
      <p className="mt-2 rounded-lg bg-navy-light/5 px-4 py-3 text-sm text-navy">
        <strong>로그인하지 않아도 모든 기능을 쓸 수 있습니다.</strong> 로그인은 선택이며, 이용 기록을 계정과 연결해 서비스 개선에
        보태고 싶을 때 쓰입니다.
      </p>
      {error && <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{ERRORS[error] ?? "로그인하지 못했습니다."}</p>}
      {ready === false && !error && (
        <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">로그인 기능이 아직 준비되지 않았습니다.</p>
      )}
      <a
        href={ready ? loginHref(next) : undefined}
        aria-disabled={!ready}
        className={`mt-6 flex items-center justify-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
          ready ? "border-gray-300 bg-white text-gray-800 hover:bg-gray-50" : "pointer-events-none border-gray-200 bg-gray-100 text-gray-400"
        }`}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.3 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
          <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.8-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-3.8-13.5-9.8l-7.8 6.1C6.6 42.6 14.6 48 24 48z" />
        </svg>
        구글 계정으로 계속하기
      </a>
      <p className="mt-6 text-xs leading-relaxed text-gray-500">
        처음 로그인하면 동의 화면이 나옵니다. 동의하기 전에는 아무 정보도 저장하지 않습니다. 자세한 내용은{" "}
        <Link href="/privacy" className="font-semibold underline">개인정보 처리방침</Link>과{" "}
        <Link href="/terms" className="underline">이용약관</Link>을 보세요.
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">로딩 중...</div>}>
      <LoginContent />
    </Suspense>
  );
}
