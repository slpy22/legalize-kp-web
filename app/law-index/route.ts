import { getLawIndex } from "@/lib/lawIndex";

// T50: 자동완성용 법령 색인(이름·별칭·분야·채택/최신 연도). 서버 메모리에 6시간 담아 둔 값을 돌려준다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const laws = await getLawIndex();
    return Response.json({ laws }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch {
    return Response.json({ laws: [] }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
