ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=development /app/dist ./dist
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3000
CMD ["node", "dist/main"]
