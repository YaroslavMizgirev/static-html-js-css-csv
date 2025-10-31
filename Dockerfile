# Базовый образ
FROM nginx:alpine

# Устанавливаем рабочую директорию
WORKDIR /usr/share/nginx/html

# Копируем статические файлы
COPY . .

# Создаем папку для SSL
RUN mkdir -p /etc/nginx/ssl

# Копируем SSL сертификаты
COPY ssl/server.crt /etc/nginx/ssl/
COPY ssl/server.key /etc/nginx/ssl/

# Копируем кастомную конфигурацию Nginx
COPY nginx.conf /etc/nginx/nginx.conf


# Создаем папку для логов (если нужно)
RUN mkdir -p /var/log/nginx

# Открываем порты для HTTP и HTTPS
EXPOSE 80
EXPOSE 443

# Команда запуска (такая же)
CMD ["nginx", "-g", "daemon off;"]
