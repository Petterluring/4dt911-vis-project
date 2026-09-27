# -------BUILD STAGE-------
FROM node:22-alpine AS builder

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# -------RUNTIME STAGE-------
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /build/dist ./dist