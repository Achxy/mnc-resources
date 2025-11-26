# Stage 1: Build using Node + Vite
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci || npm install

COPY vite.config.js ./
COPY index.html ./
COPY src ./src
COPY public ./public
COPY contents ./contents
COPY scripts ./scripts

# Single unified build step: generates manifest + builds Vite bundle
RUN npm run build


# Stage 2: Nginx serving built site
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/class-site.conf

WORKDIR /usr/share/nginx/html

# Copy built frontend
COPY --from=builder /app/dist/ ./

# Copy contents (not handled by Vite)
COPY --from=builder /app/contents ./contents

EXPOSE 80
