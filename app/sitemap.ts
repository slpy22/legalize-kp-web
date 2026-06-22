import type { MetadataRoute } from "next";

// 사이트맵은 기본적으로 빌드타임에 캐시(정적 생성)된다. 그 시점엔 백엔드가
// 안 떠 있어 법령 목록 fetch가 실패하고 정적 6개만 남는다. 요청타임에 생성하도록
// 강제해, 런타임에 백엔드(nklaw-backend)에서 전체 법령을 받아 사이트맵에 포함시킨다.
export const dynamic = "force-dynamic";

const BASE = "https://www.nk-law.kr";
const API = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/search`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/compare`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/compare/terms`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/stats`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/diff`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // 법령 페이지 (310개)
  try {
    const res = await fetch(`${API}/api/v1/ref`);
    if (res.ok) {
      const json = await res.json();
      const categories: { category: string }[] = json.data?.categories || [];

      // 카테고리 페이지 + 각 카테고리의 개별 법령 페이지
      // (전체 법령 목록은 빈쿼리 검색이 안 되므로 카테고리별로 받아 합친다)
      for (const cat of categories) {
        entries.push({
          url: `${BASE}/category/${encodeURIComponent(cat.category)}`,
          changeFrequency: "monthly",
          priority: 0.6,
        });
        try {
          const lawsRes = await fetch(
            `${API}/api/v1/ref?category=${encodeURIComponent(cat.category)}&per_page=500`,
          );
          if (lawsRes.ok) {
            const lawsJson = await lawsRes.json();
            const laws: { name?: string; law_name?: string }[] =
              lawsJson.data?.laws || [];
            for (const l of laws) {
              const name = l.name || l.law_name || "";
              if (name) {
                entries.push({
                  url: `${BASE}/law/${encodeURIComponent(name)}`,
                  changeFrequency: "monthly",
                  priority: 0.7,
                });
                entries.push({
                  url: `${BASE}/law/${encodeURIComponent(name)}/history`,
                  changeFrequency: "monthly",
                  priority: 0.4,
                });
              }
            }
          }
        } catch {
          // 개별 카테고리 실패는 건너뛴다
        }
      }

      // 비교 페이지
      const compareRes = await fetch(`${API}/api/v1/compare/?action=mapping&page=1&per_page=500`);
      if (compareRes.ok) {
        const compareJson = await compareRes.json();
        const mappings = compareJson.data?.mappings || [];
        for (const m of mappings) {
          if (m.kp_name) {
            entries.push({
              url: `${BASE}/compare/${encodeURIComponent(m.kp_name)}`,
              changeFrequency: "monthly",
              priority: 0.5,
            });
          }
        }
      }
    }
  } catch {
    // API 연결 실패 시 정적 페이지만 반환
  }

  return entries;
}
