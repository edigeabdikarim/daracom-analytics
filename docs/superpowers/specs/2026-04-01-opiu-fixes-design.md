# Спек: ОПиУ — фиксы company-wide, удаление строк, цвета, проценты

**Дата:** 2026-04-01  
**Файл:** `opiu.html`  
**Статус:** Утверждён

---

## 1. Company-wide строки

### 1.1 «Производственные расходы» (L1) → company-wide

В `OPIU_ROW_CONFIG.l1` добавить `companyWide: true`:

```js
'Производственные расходы': { colorType: 'expense', companyWide: true }
```

Эффект: строка-заголовок L1 рендерится как одна ячейка colspan на все магазины.  
L2 дочерние группы (`Переменные`, `Прямые постоянные`, `Общепроизводственные`) — поведение без изменений.

### 1.2 «Операционная прибыль (EBITDA)» (CALC) → всегда company-wide

Добавить в `OPIU_ROW_CONFIG`:

```js
calcCW: new Set(['Валовая прибыль', 'Операционная прибыль (EBITDA)'])
```

Обновить `isCompanyWide()` для `type === 'calc'`:
- **было:** `return false` (затем `row.merged` в `renderOpiuRow`)
- **станет:** `return OPIU_ROW_CONFIG.calcCW.has(label)`

Строки «Маржинальный доход» и «Валовая прибыль по направлениям» остаются per-direction.

---

## 2. Удаление строк

Добавить константу:

```js
const OPIU_ROWS_SKIP = new Set([
  'Рентабельность по маржинальному доходу, %',
  'Рентабельность по направлениям, %',
  'Рентабельность по валовой прибыли, %',
]);
```

В `renderOpiuMatrix`, в цикле `rows.forEach`:
1. Если `label` в `OPIU_ROWS_SKIP` → `return` (пропустить).
2. Добавить флаг `let cutAfterEBITDA = false`. После рендера строки «Операционная прибыль (EBITDA)» установить `cutAfterEBITDA = true`. При `cutAfterEBITDA === true` в начале цикла → `return`.

---

## 3. Цвета таблицы

### 3.1 Убрать зелёный фон из колонки Итого

Убрать зелёные фоны и бордеры из `.om-td-total` и всех его override в L0/L1/L2/CALC/article строках:
- `.om-l0-row td.om-td-total { background: #15803D }` → убрать
- `.om-l1-row td.om-td-total { background: #0F4C2A }` → убрать
- `.om-l2-row td.om-td-total { background: #FEF3C7 }` → убрать
- `.om-calc-row td.om-td-total { background: #D1FAE5 }` → убрать
- `.om-article-row td.om-td-total { background: #F0FDF4 }` → убрать
- `.om-article-row.om-alt td.om-td-total { background: #F0FDF4 }` → убрать
- `.om-table tr.om-article-row:hover td.om-td-total` → убрать hover-override
- `.om-td-total { border-left/right: 2px solid #D1FAE5 }` → заменить на `#E5E7EB`

Итого-ячейка наследует фон своей строки (как все остальные ячейки).

### 3.2 Все фоны tbody → белый и бледно-серый

| CSS-класс | Старый фон | Новый фон | Текст |
|---|---|---|---|
| `.om-l0-row td` | `#1E3A5F` | `#E5E7EB` | `#111827`, bold |
| `.om-l1-row td` | `#162D4A` | `#D1D5DB` | `#111827`, bold |
| `.om-l2-row td` | `#FFF7ED`, текст `#7C2D12` | `#F3F4F6` | `#111827`, bold |
| `.om-calc-row td` | `#ECFDF5`, текст `#065F46` | `#EDF2FF` | `#111827`, bold |
| `.om-article-row` | `#fff` | без изменений | без изменений |
| `.om-article-row.om-alt` | `#F9FAFB` | без изменений | без изменений |

Бордеры строк L0/L1/L2/CALC:  
- `border-top/bottom: 2-3px solid #1E3A5F` → оставить (структурные линии важны для печати)

Заголовок `thead` (`.om-table th`) — без изменений (тёмно-синий, `#1E3A5F`).

---

## 4. Контрастность текстов

| CSS-класс | Старый цвет | Новый цвет |
|---|---|---|
| `.om-pct` | `#9CA3AF` (бледный) | `#374151` |
| `.om-pct-total` | `#6EE7B7` (бледный зелёный) | `#374151` |
| `.om-zero` | `#D1D5DB` | `#9CA3AF` |

`.om-negative` (красный для отрицательных значений) — **оставить**.

---

## 5. Расчёт процентов

### 5.1 Знак

**Было:** `Math.abs(val) / Math.abs(revenue) * 100` → всегда положительный %  
**Станет:** `val / Math.abs(revenue) * 100` → знак сохраняется

Если `revenue = 0` или отсутствует — % не показывать (уже обрабатывается проверкой `Math.abs(revenue) > 0.01`).

### 5.2 Отображение

- Всегда чёрный/тёмный текст (`#374151`)
- Формат: `(-50.0%)` для отрицательных, `(12.3%)` для положительных
- Убрать разный класс для total-колонки (`om-pct-total` → единый класс `om-pct`)

### 5.3 База для company-wide ячеек

Company-wide colspan-ячейки уже используют `totalRevenue` в `renderOpiuRow` — корректно, не менять.  
Per-direction ячейки используют `storeRevenue[s]` — корректно, не менять.

---

## 6. Не меняется

- Структура `OPIU_ROW_CONFIG` (только добавления `companyWide` + `calcCW`)
- GAS endpoint — не трогаем
- Логика `computeL1Total`
- `fmtShort`
- Кнопка печати и `@page landscape`
- Thead (тёмно-синий заголовок)
