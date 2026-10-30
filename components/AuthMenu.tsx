"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authConfig, me, type Me } from "@/lib/account";

/**
 * 헤더의 로그인 메뉴(T43). 로그인은 선택이라 작게 둔다.
 * 백엔드에 로그인 기능이 준비되지 않았으면(auth/config.login=false) 아무것도 그리지 않는다.
 */
export default function AuthMenu({ variant, onNavigate }: { variant: "desktop" | "mobile"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    authConfig()
      .then(async ({ data }) => {
        if (!alive || !data?.login) return;
        setEnabled(true);
        const r = await me();
        if (alive) setState(r.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // 로그인·동의·탈퇴 뒤 주소가 바뀌면 다시 읽는다
  }, [pathname]);

  if (!enabled) return null;
  const user = state?.user;
  const base =
    variant === "desktop"
      ? "rounded px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
      : "block rounded px-3 py-2 text-sm transition-colors hover:bg-white/10";
  const links = user
    ? [
        ...(state?.is_admin ? [{ href: "/admin", label: "이용 추이" }] : []),
        { href: "/account", label: "내 계정" },
      ]
    : [{ href: `/login?next=${encodeURIComponent(pathname || "/")}`, label: "로그인" }];
  return (
    <>
      {links.map((l) => (
        <Link key={l.href} href={l.href} onClick={onNavigate} className={`${base} text-white/80`}>
          {l.label}
        </Link>
      ))}
    </>
  );
}
