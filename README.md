# static-html-js-css-csv

Простой статичный html+js+css с возможностью хранения данных во внешнем csv-файле.

Дополнен Dockerfile с nginx конфигурацией и папкой /ssl, в которой находятся сгенерированные с помощью утилиты mkcert сертификаты для использования HTTPS протокола.

## Установка и генерация сертификатов MKCERT

```Shell
# Установка mkcert (пример для Windows с WinGet)
winget install mkcert

# Инициализация
mkcert -install

# Создание сертификатов для localhost
mkcert localhost

# Переместите созданные файлы в папку ssl
mv localhost.pem static-html-js-css-csv/ssl/server.crt
mv localhost-key.pem static-html-js-css-csv/ssl/server.key
```

## Проверка правильности создания сертификатов OpenSSL

```Shell
# Установка openssl (пример для Windows с WinGet)
winget install openssl

cd static-html-js-css-csv/ssl

# Проверяем содержимое сертификата
openssl x509 -in server.crt -text -noout | Select-String "Subject:"

# Проверяем ключ
## PowerShell
& {
    openssl rsa -in server.key -check -noout 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Ключ валиден" -ForegroundColor Green
    } else {
        Write-Host "❌ Ошибка: Ключ невалиден или файл не существует" -ForegroundColor Red
    }
}
## BASH
openssl rsa -in server.key -check -noout 2>nul && echo ✅ Ключ валиден || echo ❌ Ключ невалиден
```

## Запуск в Docker

```Shell
# Сборка образа
docker build -t simple-static-site .

# Запуск с пробросом портов
docker run -d -p 80:80 -p 443:443 --name my-library simple-static-site
```

## Пример использования

После запуска откройте [https://localhost](https://localhost/) и убедитесь, что:

- Сайт открывается по HTTPS
- В адресной строке браузера есть значок замка (может быть перечеркнутым для самоподписанных сертификатов)
- HTTP запросы автоматически перенаправляются на HTTPS
