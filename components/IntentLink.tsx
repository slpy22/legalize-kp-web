"use client";

import Link from "next/link";
import { useState, type ComponentProps } from "react";

// T94: 머리말 상단 메뉴용 — 화면을 열 때는 미리 받지 않고, 마우스를 올리거나 손가락을 대면 그때 미리 받는다.
// 링크 하나를 미리 받는 데 ?_rsc= 요청이 3건 남짓 나가(Next 16 조각별 미리 받기) 메뉴 5개만으로 화면마다 16건이었다.
// 나머지 화면 안 링크는 모두 prefetch={false}(tests/t94Prefetch.test.mjs).
export default function IntentLink({ onMouseEnter, onTouchStart, ...props }: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent ? null : false}
      onMouseEnter={(e) => {
        setIntent(true);
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        setIntent(true);
        onTouchStart?.(e);
      }}
    />
  );
}
