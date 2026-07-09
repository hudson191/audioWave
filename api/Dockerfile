# ---- build: compila o TypeScript ----
FROM node:22-alpine AS build
WORKDIR /app
# instala TODAS as deps (inclui devDeps: typescript) usando o lockfile
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- runtime: só deps de produção + dist ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# API sem auth: escuta em 0.0.0.0 apenas na rede interna do compose
# (a porta 3001 NÃO é publicada para o host)
ENV HOST=0.0.0.0
ENV PORT=3001
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
# diretório de persistência (montado como volume no compose)
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
