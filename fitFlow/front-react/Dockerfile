FROM node:20-alpine AS build

WORKDIR /app

COPY fitFlow/front-react/doc/package*.json ./

RUN npm ci

COPY fitFlow/front-react/doc /app

RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine

COPY fitFlow/front-react/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
