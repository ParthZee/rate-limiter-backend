# Common Shared setup
FROM node:24 AS base
WORKDIR /app
COPY package.json package-lock.json ./

# Development Setup
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]

# Production Setup (exclude jest and supertest dev dependencies)
FROM base AS production
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
