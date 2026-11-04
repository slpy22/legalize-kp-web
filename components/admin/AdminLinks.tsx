import Link from "next/link";
import { decPath } from "./decPath";
import { bare, lawHref, pageHref } from "./pageLink";

/**
 * T99: 관리 표의 경로·법령명 링크 — 새 탭(rel=noopener noreferrer)·미리 받기 없음(prefetch={false}).
 * 관리자 브라우저는 운영자 기기 쿠키(nklaw_opdev)·관리자 로그인으로 내부 접속이라, 눌러 연 화면도 이용 통계에 들어가지 않는다.
 */
const LINK = "text-blue-800 hover:underline";

/** 저장된 경로: 글자는 decPath(query 뗌), 링크는 저장된 경로 그대로 — 화면이 아닌 경로는 글자만. */
export function PathLink({ path, className = LINK }: { path: string | null | undefined; className?: string }) {
  const text = decPath(bare(path));
  const href = pageHref(path);
  if (!href) return <>{text}</>;
  return (
    <Link href={href} prefetch={false} target="_blank" rel="noopener noreferrer" className={className} title="새 탭에서 열기">
      {text}
    </Link>
  );
}

/** 법령명 → /law/<이름>. */
export function LawLink({ name, className = LINK }: { name: string | null | undefined; className?: string }) {
  const href = lawHref(name);
  if (!href) return <>{name ?? ""}</>;
  return (
    <Link href={href} prefetch={false} target="_blank" rel="noopener noreferrer" className={className} title="새 탭에서 열기">
      {name}
    </Link>
  );
}
