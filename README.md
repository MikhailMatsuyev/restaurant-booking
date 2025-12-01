### Установке проектных зависимостей
cd api-service

npm install --legacy-peer-deps


cd booking-service

npm install --legacy-peer-deps

### В корне restaurant-booking/
pwd

docker-compose up -d

### Старт сервисов
cd api-service

npm run start:dev

cd booking-service

npm run start

### Запуск фронта
cd frontend

npm i

npx http-server -p 8080 -c-1

### Запуск фронта
http://127.0.0.1:8080/

### Тестирование апи
Команды для тестирования всех ендпоинтов в файле, который в корней проекта

api-tests.http


![img.png](img.png)
