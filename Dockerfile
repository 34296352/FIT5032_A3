
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build


FROM nginx:alpine


COPY --from=builder /app/dist /usr/share/nginx/html


RUN sed -i 's/listen\s\+80;/listen 8080;/' /etc/nginx/conf.d/default.conf


EXPOSE 8080


CMD ["nginx", "-g", "daemon off;"]
