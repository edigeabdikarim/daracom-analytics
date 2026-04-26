# Дизайн: Сводная (печать) — новая секция в dds.html

**Дата:** 2026-04-26  
**Файл:** `dds.html`  
**Статус:** утверждён

---

## Цель

Выделить печатную версию «Сводной» в отдельную навигационную секцию `section-summary-print`. Существующая «Сводная» (`section-summary`) остаётся без изменений как интерактивный инструмент. Новая секция — чистый, ЧБ-читабельный отчёт, оптимизированный для печати.

---

## Что входит

### 1. Навигация

Добавить в `<nav>` новый пункт **«📄 Сводная (печать)»** после «📋 Сводная».  
ID секции: `section-summary-print`.  
`SECTION_PRINT_TITLES` добавить: `'section-summary-print': 'Сводная (печать)'`.

### 2. Шапка секции (экран)

```
[ 📄 Сводная (печать)  Апрель 2026 ]   [☐ Только группы]  [🖨️ Печать]
```

- Заголовок + месяц
- Чекбокс `#sprintCompactToggle` «Только группы» — при включении добавляет класс `sprint-compact` на `<body>`
- Кнопка «🖨️ Печать»

### 3. Print-шапка (только при печати)

```
ДДС · Daracom — Сводная по статьям и магазинам        Чистый Cash Flow (операционный)
Отчётный период: Апрель 2026                                     −7 084 394 ₸
──────────────────────────────────────────────────────────────────────────────
```

Чип «Чистый Cash Flow» — значение из `calcKPI(filteredRows).netCF` (операционный, без тех. операций).  
Элемент: `#sprintPrintHeader` (скрыт на экране, виден при печати аналогично другим секциям).

### 4. Блок итогов (виден и на экране, и при печати)

Три ячейки в строку, обрамлены рамкой:

| Итого поступлений | Итого расходов | Чистый CF (опер.) |
|---|---|---|
| +178 218 736 ₸ | −185 303 130 ₸ | −7 084 394 ₸ |

Значения из `calcKPI(filteredRows)`: `incoming`, `outgoing`, `netCF`.  
Элемент: `#sprintTotalsBar`.

### 5. Таблица `sprint-tbl`

**CSS — новый класс `sprint-tbl`** (не переопределяет `.summary-tbl`):
- Белый фон, чёрные границы `#111`, без цветных фонов
- Группы расходов: фон `#F3F4F6`, `font-weight: 700`, жирная верхняя граница `2px solid #111`
- Строки поступлений: `font-weight: 700`, `border-top/bottom: 2px solid #111`
- Подстатьи: белый фон, `padding-left: 18px` для первой ячейки
- `font-size: 11px`
- Колонка `% выр.` имеет класс `sprint-col-pct`

**Структура HTML:**
```html
<table class="sprint-tbl">
  <thead>…заголовки…</thead>
  <!-- Поступления — один tbody, всегда развёрнуты -->
  <tbody class="sprint-income-body">
    <tr class="sprint-income">…</tr>   <!-- группа -->
    <tr class="sprint-article">…</tr>  <!-- подстатьи -->
  </tbody>
  <!-- Каждая группа расходов — отдельный tbody -->
  <tbody class="sprint-expense-body" style="break-inside:avoid">
    <tr class="sprint-expense">…</tr>  <!-- заголовок группы -->
    <tr class="sprint-article">…</tr>  <!-- подстатьи -->
  </tbody>
  …
</table>
```

Ключевые свойства:
- `thead { display: table-header-group }` — шапка повторяется на каждой странице
- `tbody.sprint-expense-body { break-inside: avoid; page-break-inside: avoid }` — группа не разрывается по странице

**Compact mode** (`body.sprint-compact`):
- `.sprint-article { display: none }` — скрыть подстатьи расходов
- Поступления остаются развёрнуты (`.sprint-income-body .sprint-article` не скрывается)
- `#sprintModeNote { display: block }` — примечание «* отображаются только итоги по группам»

### 6. Рендер-функция `renderSummaryPrint()`

- Использует те же данные: `buildSummaryData(allRows)` → `{ stores, groups, totalIncome }`
- Считает итоги: `calcKPI(filteredRows)` → `incoming`, `outgoing`, `netCF`
- Обновляет `#sprintPrintHeader .ph-month`, `#sprintPrintHeader .ph-cf-value`
- Заполняет `#sprintTotalsBar`
- Строит таблицу с отдельными `<tbody>` на каждую группу расходов

### 7. @media print — добавки к существующему блоку

```css
/* новая секция */
#section-summary-print.active #sprintPrintHeader { display: block !important; }
body.sprint-compact .sprint-article { display: none !important; }
.sprint-tbl thead { display: table-header-group; }
.sprint-tbl th, .sprint-tbl td { position: static !important; }
tbody.sprint-expense-body { break-inside: avoid; page-break-inside: avoid; }
```

### 8. Вызов рендера

`renderSummaryPrint()` вызывается в той же точке, где `renderSummaryMatrix()` — при смене месяца и при первой загрузке данных.

---

## Что НЕ меняется

- `section-summary` и весь его код — без изменений
- `buildSummaryData()`, `renderSummaryCell()`, `summaryStoreName()` — переиспользуются как есть
- `calcKPI()` — переиспользуется как есть

---

## Файлы

- **Изменяется:** `dds.html` (только)
- **GAS:** не меняется

---

## Самопроверка спека

- Нет TBD и TODO
- Нет противоречий: compact скрывает только `.sprint-article` расходов, поступления остаются
- Scope: один файл, одна функция, одна секция — реализуемо за один PR
- CF chip = `calcKPI` операционный — явно указан источник данных
