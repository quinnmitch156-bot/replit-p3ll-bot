FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS runner

RUN apt-get update && apt-get install -y \
    libcairo2 libpango1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]
