FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

COPY . /app

# Accept build arguments for Vite environment variables
ARG VITE_API_BASE_URL
ARG VITE_LIBRETRANSLATE_ENDPOINT
ARG VITE_SSE_SINGLE
ARG VITE_SSE_BULK

# Make them available as environment variables during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_LIBRETRANSLATE_ENDPOINT=$VITE_LIBRETRANSLATE_ENDPOINT
ENV VITE_SSE_SINGLE=$VITE_SSE_SINGLE
ENV VITE_SSE_BULK=$VITE_SSE_BULK

# Build the Vue app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html/console/ph-pse/mqc
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]