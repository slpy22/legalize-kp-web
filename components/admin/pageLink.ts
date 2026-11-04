/**
 * T99: 관리 표의 페이지 경로·법령명을 그 화면으로 가는 링크로 — 링크 주소만 고르는 순수 함수(`npm test` 가 직접 부른다).
 * 경로: 보이는 글자는 decPath(AdminLinks.tsx), 링크는 저장된 경로 그대로(이미 퍼센트 인코딩 — 다시 인코딩하지 않는다).
 * 검색어·query(? 뒤)·# 뒤는 링크에도 글자에도 넣지 않는다. 사이트 화면이 아닌 경로(/api·/admin·/_next·파일 등)는 글자만(링크 null).
 * 법령명: /law/<encodeURIComponent(이름)>.
 */

/** 사이트 화면의 첫 경로 조각('' = 첫 화면). 여기에 없는 것(/api·/admin·/_next·/law-index·/robots.txt 등)은 링크를 걸지 않는다. */
const SCREENS = new Set(["", "about", "account", "category", "chat", "compare", "diff", "law", "login", "privacy", "search", "stats", "terms"]);

/** 저장된 경로에서 query·# 를 뗀 경로 부분. */
export function bare(path: string | null | undefined): string {
  return (path ?? "").split(/[?#]/, 1)[0];
}

/** 저장된 경로 → 링크 주소(저장된 그대로, query 뗌) 또는 null(글자만). */
export function pageHref(path: string | null | undefined): string | null {
  const p = bare(path);
  // 사이트 안쪽 절대 경로만: '/' 하나로 시작(//host·\\host·스킴 금지), 공백·제어 문자 없음
  if (!p.startsWith("/") || p.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(p)) return null;
  const segs = p.slice(1).split("/");
  // '.'·'..' 조각(인코딩된 %2e 포함)은 다른 경로로 풀릴 수 있어 글자만
  if (segs.some((x) => /^(\.|%2e){1,2}$/i.test(x))) return null;
  if (!SCREENS.has(segs[0])) return null;
  return p;
}

/** 법령명 → /law/<이름> (빈 이름은 null). */
export function lawHref(name: string | null | undefined): string | null {
  const n = (name ?? "").trim();
  return n ? `/law/${encodeURIComponent(n)}` : null;
}
