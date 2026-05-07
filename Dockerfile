FROM node:20-alpine AS base

# 의존성 설치
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 빌드
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# API URL을 빈값으로 → 상대 경로로 호출 (같은 도메인 nginx가 프록시)
ENV NEXT_PUBLIC_API_URL=

RUN npm run build

# 프로덕션
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=80
# 서버 컴포넌트에서 API 호출 시 내부 네트워크 사용
ENV INTERNAL_API_URL=http://nklaw-backend:8080

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 출력 복사
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 80

CMD ["node", "server.js"]
