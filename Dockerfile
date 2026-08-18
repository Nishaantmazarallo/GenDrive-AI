# Multi-stage build for full-stack GenDrive AI app
FROM node:20-alpine AS deps
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
COPY frontend/package.json frontend/package-lock.json ./frontend/

RUN cd frontend && npm ci
RUN cd backend && npm ci

FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY frontend ./frontend
COPY backend ./backend

RUN cd frontend && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/backend ./backend
COPY --from=build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend
EXPOSE 5000
CMD ["node", "server.js"]
