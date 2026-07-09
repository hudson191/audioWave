# ---- build: gera os estáticos com Vite ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime: nginx serve os estáticos e faz proxy de /api ----
FROM nginx:1.27-alpine AS runtime
# remove a config default e usa a nossa (SPA fallback + proxy /api → api:3001)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/audiowave.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
