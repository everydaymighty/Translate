FROM nginx:alpine
COPY desktop.html /usr/share/nginx/html/index.html
EXPOSE 80
