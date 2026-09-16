FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* được Next.js inline ngay lúc build, không đọc được từ runtime
# env_file của docker-compose — phải truyền vào như build arg.
# (Đã bỏ NEXT_PUBLIC_API_KEY — auth chuyển sang JWT thật, biến này không còn
# được dùng ở đâu trong frontend/src nữa. Giữ lại ARG chết dễ khiến hệ tự-quét
# env của nền tảng deploy tưởng đây là biến cần cấp — xem lesson VITE_API_URL
# ở Legal_AI_Platform.)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
