# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_fetch_timeout=120000
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts --legacy-peer-deps --verbose

COPY . .
RUN npm run db:generate
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV npm_config_fetch_timeout=120000
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

RUN echo "legacy-peer-deps=true" > .npmrc

RUN apk add --no-cache openssl dumb-init

COPY package*.json ./

# Copy necessary files from builder
COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/prisma prisma
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
