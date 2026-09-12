FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DB_PATH=/app/data/data.sqlite
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src
VOLUME ["/app/data"]
EXPOSE 4000
CMD ["node", "src/index.js"]
