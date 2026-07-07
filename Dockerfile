FROM node:20

RUN apt-get update && apt-get install -y \
    python3 make g++ \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY .npmrc ./
COPY package*.json ./

RUN npm config delete proxy || true \
    && npm config delete https-proxy || true \
    && npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]
