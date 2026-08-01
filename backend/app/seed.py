from app import services
from app.db import get_db

# A small but realistic software-delivery plan. Predecessors reference task
# names; replace_all resolves them to ids and schedules start dates.
SEED_TASKS = [
    {"name": "Сбор требований", "description": "Интервью со стейкхолдерами, фиксация scope", "assignee": "Анна", "duration": 3, "predecessor_names": []},
    {"name": "UX/UI дизайн", "description": "Макеты ключевых экранов", "assignee": "Мария", "duration": 5, "predecessor_names": ["Сбор требований"]},
    {"name": "Проектирование API", "description": "Схема данных и контракты эндпоинтов", "assignee": "Борис", "duration": 3, "predecessor_names": ["Сбор требований"]},
    {"name": "Бэкенд разработка", "description": "Реализация API и бизнес-логики", "assignee": "Борис", "duration": 8, "predecessor_names": ["Проектирование API"]},
    {"name": "Фронтенд разработка", "description": "Верстка и интеграция с API", "assignee": "Алекс", "duration": 8, "predecessor_names": ["UX/UI дизайн"]},
    {"name": "Интеграция", "description": "Связка фронта и бэка, сквозные сценарии", "assignee": "Алекс", "duration": 4, "predecessor_names": ["Бэкенд разработка", "Фронтенд разработка"]},
    {"name": "Тестирование", "description": "QA, регресс, багфиксы", "assignee": "Карина", "duration": 5, "predecessor_names": ["Интеграция"]},
    {"name": "Деплой в прод", "description": "CI/CD, релиз, мониторинг", "assignee": "Борис", "duration": 2, "predecessor_names": ["Тестирование"]},
]


async def ensure_seed() -> None:
    count = await get_db()[services.COLLECTION].count_documents({})
    if count == 0:
        await services.replace_all([dict(t) for t in SEED_TASKS])


async def reset_seed() -> None:
    await services.replace_all([dict(t) for t in SEED_TASKS])
