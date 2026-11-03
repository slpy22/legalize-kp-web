/** T93: 저장된 주소(퍼센트 인코딩)를 글자로 — /law/%EB%8F%84%EB%A1%9C%EB%B2%95 → /law/도로법.
 * %XX 가 이어진 덩어리마다 따로 풀고, 풀 수 없는 덩어리(잘린 UTF-8·잘못된 인코딩)는 원문 그대로 둔다. */
export function decPath(x: string | null | undefined): string {
  const s = x ?? "";
  try {
    return decodeURIComponent(s);
  } catch {
    return s.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
      try {
        return decodeURIComponent(run);
      } catch {
        return run;
      }
    });
  }
}
