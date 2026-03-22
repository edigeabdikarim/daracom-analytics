# Daracom Analytics

Внутренняя аналитическая система для управления сетью магазинов Daracom.

## Файлы

| Файл | Описание |
|------|----------|
| `index.html` | Основной дашборд: Планы продаж, Показатели, Финансы ДДС, Маркетинг, Аналитика сотрудников |
| `dashboard.html` | Executive Dashboard: ОПиУ + ДДС, KPI карточки, графики, сводка по магазинам |
| `gas/dashboard.gs` | Google Apps Script для `dashboard.html` |

---

## Настройка Executive Dashboard (`dashboard.html`)

### Шаг 1 — Задеплоить GAS скрипт

1. Открой [Google Apps Script](https://script.google.com)
2. Создай новый проект, вставь содержимое `gas/dashboard.gs`
3. **Deploy → New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Скопируй URL деплоя (выглядит как `https://script.google.com/macros/s/AKf.../exec`)

### Шаг 2 — Вставить URL в dashboard.html

Открой `dashboard.html`, найди блок `CONFIG` и замени:
```javascript
const CONFIG = {
  GAS_URL: 'ВСТАВЬ_URL_СЮДА',  // ← вставить URL из шага 1
  CACHE_TTL_MS: 30 * 60 * 1000,
};
```

### Шаг 3 — Открыть

Открой `dashboard.html` в браузере. При первом открытии данные загружаются ~5–15 секунд.

---

## Данные

- **ОПиУ** — `1Z6KR6NK2Y86QrQ2aLW-vRk44yP98OMU0mxzNakw8v_s`
- **ДДС** — `171I_chBn4SzuinIL4USP8QI9FL8g1X0MQEwqFwDuscc`

ID таблиц прописаны в `gas/dashboard.gs`. При необходимости замени там же.

---

## Кэширование

Dashboard кэширует данные в `localStorage` на 30 минут. Кнопка **Обновить** принудительно перезапрашивает GAS.

---

## Доступ

Для работы `index.html` нужны GAS URL (прописаны внутри файла).
Для работы `dashboard.html` нужен только URL из `gas/dashboard.gs`.
