FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY src ./src

RUN mkdir -p /app/data && chown node:node /app/data

USER node

EXPOSE 3000

CMD ["sh", "-c", "npm run db:bootstrap && npm run start"]
