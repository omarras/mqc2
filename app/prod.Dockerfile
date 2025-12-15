FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . /app

# Build the Vue app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/console/ph-pse/mqc
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]