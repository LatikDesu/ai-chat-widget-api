# AI Chat Widget System

Система чат-виджета с искусственным интеллектом для интеграции на веб-сайты. Построена на микросервисной архитектуре с использованием Docker.

## 🌟 Возможности

- Интеграция с LLM (Language Learning Models)
- Поддержка различных моделей через Ollama
- Встраиваемый виджет для веб-сайтов
- Система управления API ключами
- Аналитика и статистика использования
- Кастомизация внешнего вида
- Управление базой знаний через промпты, pdf-файлы, векторные базы данных

## 🏗 Архитектура

```
docker_data/
	└── compose/ # Конфигурация Docker Compose
	└── appdata/
		├── chat-api/ # Основной сервис
		├── ollama/ # Локальное хранение моделей AI
		├── portainer/ # Управление контейнерами
		├── postgres/ # База данных

```

## 🛠 Технологии

- **Backend**: Node.js, TypeScript, Prisma ORM
- **Frontend**: Vue.js, Nuxt.js, TailwindCSS
- **Database**: PostgreSQL
- **AI**: Ollama, LangChain
- **Infrastructure**: Docker, Docker Compose

## 🚀 Быстрый старт

1. Клонируйте репозиторий:
2. Создайте файл конфигурации:

```bash
	cp .env.example .env
```

3. Настройте переменные окружения в `.env`

4. Запустите систему:

```bash
   docker-compose -f docker-compose.prod.yml build
   docker-compose -f docker-compose.prod.yml up -d
```

## 📝 Конфигурация

Основные настройки находятся в следующих файлах:

- `.env` - основные переменные окружения
- `docker-compose.yml` - конфигурация Docker
- `docker_data/appdata/chat-api/.env` - настройки чат-сервиса

## 📊 Мониторинг

Логи доступны через контейнеры:

- Portainer - `http://localhost:9000`
- Dozzle - `http://localhost:8082`

## 🔒 Безопасность

- Аутентификация через JWT токены
- Rate limiting для API запросов
- Валидация входящих данных
- CORS защита
- Шифрование чувствительных данных

## 🔗 Полезные ссылки

- [Документация API](https://ai-chat-api.apidocumentation.com)
- [Демо виджета](https://chat-api.esoraine.online/demo)
