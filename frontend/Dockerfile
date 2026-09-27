# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# Runtime stage
FROM node:24-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist