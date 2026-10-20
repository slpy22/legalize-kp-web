import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 법령명 정정(T2)으로 바뀐 옛 URL 을 정정명으로 301 — 외부 링크·검색엔진 색인 보존.
  // 경로는 percent-encoding 된 형태로 매칭된다. (api config legacy_names 와 같은 2건)
  async redirects() {
    return [
      // 반동문화사상문화배격법 → 반동사상문화배격법
      { source: "/law/%EB%B0%98%EB%8F%99%EB%AC%B8%ED%99%94%EC%82%AC%EC%83%81%EB%AC%B8%ED%99%94%EB%B0%B0%EA%B2%A9%EB%B2%95", destination: "/law/%EB%B0%98%EB%8F%99%EC%82%AC%EC%83%81%EB%AC%B8%ED%99%94%EB%B0%B0%EA%B2%A9%EB%B2%95", statusCode: 301 },
      { source: "/law/%EB%B0%98%EB%8F%99%EB%AC%B8%ED%99%94%EC%82%AC%EC%83%81%EB%AC%B8%ED%99%94%EB%B0%B0%EA%B2%A9%EB%B2%95/:path*", destination: "/law/%EB%B0%98%EB%8F%99%EC%82%AC%EC%83%81%EB%AC%B8%ED%99%94%EB%B0%B0%EA%B2%A9%EB%B2%95/:path*", statusCode: 301 },
      // 사회주의농총발전법 → 사회주의농촌발전법
      { source: "/law/%EC%82%AC%ED%9A%8C%EC%A3%BC%EC%9D%98%EB%86%8D%EC%B4%9D%EB%B0%9C%EC%A0%84%EB%B2%95", destination: "/law/%EC%82%AC%ED%9A%8C%EC%A3%BC%EC%9D%98%EB%86%8D%EC%B4%8C%EB%B0%9C%EC%A0%84%EB%B2%95", statusCode: 301 },
      { source: "/law/%EC%82%AC%ED%9A%8C%EC%A3%BC%EC%9D%98%EB%86%8D%EC%B4%9D%EB%B0%9C%EC%A0%84%EB%B2%95/:path*", destination: "/law/%EC%82%AC%ED%9A%8C%EC%A3%BC%EC%9D%98%EB%86%8D%EC%B4%8C%EB%B0%9C%EC%A0%84%EB%B2%95/:path*", statusCode: 301 },
    ];
  },
};

export default nextConfig;
