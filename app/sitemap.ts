import type { MetadataRoute } from "next";

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

      // 카테고리 페이지
      for (const cat of categories) {
        entries.push({
          url: `${BASE}/category/${encodeURIComponent(cat.category)}`,
          changeFrequency: "monthly",
          priority: 0.6,
        });
      }

      // 개별 법령 페이지
      const namesRes = await fetch(`${API}/api/v1/law?action=search&q=&mode=keyword&page=1&per_page=500`);
      if (namesRes.ok) {
        const namesJson = await namesRes.json();
        const results = namesJson.data?.results || [];
        for (const r of results) {
          const name = r.law_name || r.name || "";
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
