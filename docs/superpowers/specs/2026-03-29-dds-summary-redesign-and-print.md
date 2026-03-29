# Spec: Редизайн «Сводная» + кнопка печати в dds.html

**Дата:** 2026-03-29
**Файлы:** только `dds.html` (GAS не затрагивается)

---

## 1. Фиксированный порядок магазинов

Заменить динамическую сортировку по обороту на статический порядок.

### Новая константа

```js
const DDS_STORES_ORDER = [
  'Офис',
  'Магазин Астана',
  'Магазин Мира',
  'Магазин Есентай',
  'Магазин Абайка',
  'Магазин Восход',
  'Магазин Above',
  'Магазин Above Астана',
  'Магазин Kaspi'
];
```

### Изменение в `buildSummaryData()`

Вместо `Object.keys(storeTurnover).sort(...)`:

```js
const knownStores = new Set(DDS_STORES_ORDER);
const extraStores = Object.keys(storeTurnover)
  .filter(s => !knownStores.has(s) && s !== 'Компания')
  .sort((a, b) => a.localeCompare(b, 'ru'));

const stores = [
  ...DDS_STORES_ORDER.filter(s => storeTurnover[s]),
  ...extraStores
];
```

- Магазины из `DDS_STORES_ORDER` включаются только если у них есть данные в текущем месяце
- Неизвестные магазины (не в списке, не «Компания») добавляются в конец алфавитно
- «Компания» по-прежнему исключается из `stores` (обрабатывается через `isCompanyWide`)

---

## 2. Редизайн таблицы `.summary-tbl` (Стиль A)

### Шапка таблицы

| Элемент | Стиль |
|---------|-------|
| `thead tr` | `background: #1E3A5F`, `color: #fff` |
| `thead th` | `border: 1px solid #2d4e73`, `font-size: 11px`, `text-transform: uppercase`, `letter-spacing: 0.04em` |
| Колонка «Итого» в thead | `background: #15803D`, `border-color: #166534` |
| `th:first-child` | sticky left, `min-width: 180px` |
| `th:nth-child(2)` | sticky left (после первой), зелёный фон |

### Строки-группы (`.smg-row`)

| Тип | Фон | Левый бордер | Цвет текста |
|-----|-----|-------------|-------------|
| Поступления (`sg-income`) | `#EFF6FF` | `4px solid #2563EB` | `#1E3A5F` |
| Расходы (`sg-expense`) | `#FFF7ED` | `4px solid #EA580C` | `#7C2D12` |
| Нейтральный (`sg-neutral`) | `#F3F4F6` | `4px solid #6B7280` | `#374151` |

- `font-weight: 700`, `font-size: 12px`
- Граница ячеек: цветная (соответствующий `border-color` группы)

### Строки статей (`.sma-row`)

- Чередование: нечётные `#fff`, чётные `#F9FAFB` — реализуется через JS-счётчик строк в `renderSummaryMatrix` (не CSS `nth-child`, так как группы и статьи вперемешку)
- Отступ первой ячейки: `padding-left: 24px`
- Текст: `#111827` (высокий контраст)
- Все ячейки: `border: 1px solid #E5E7EB` (полная сетка)

### Значения (замена `renderSummaryCell`)

| Условие | Цвет | Жирность |
|---------|------|----------|
| `value > 0` | `#15803D` | `font-weight: 700` |
| `value < 0` | `#DC2626` | `font-weight: 700` |
| `value === 0` | `#6B7280` текст «—» | normal |

### Колонка «Итого» в строках статей

- `background: #F0FDF4` для поступлений (value > 0)
- `background: #FFF5F5` для расходов (value < 0)
- `font-weight: 700`

### Hover

```css
.summary-tbl tr.sma-row:hover td { background: #F0F9FF; }
.summary-tbl tr.sma-row:hover td:nth-child(2) { background: #DCFCE7; }
```

---

## 3. Кнопка печати

### Размещение

Кнопка добавляется в заголовок каждой секции — справа от `<h2 class="section-title">`.

HTML-паттерн в каждой секции:
```html
<div class="flex items-center justify-between mb-4">
  <h2 class="section-title" style="margin-bottom:0">...</h2>
  <button class="print-btn" onclick="window.print()">🖨️ Печать</button>
</div>
```

Секции, куда добавляется кнопка: Обзор, Куда ушли, Сводная, По магазинам, По дням.

### Стиль кнопки

```css
.print-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background: #F3F4F6;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.print-btn:hover { background: #E5E7EB; }
```

---

## 4. Стили печати (`@media print`)

### `@page`

```css
@page { size: A4 landscape; margin: 1cm; }
```

### Скрыть при печати

- `.sidebar` (фильтры)
- `.nav` / `nav` (навигация по разделам)
- `header` (кнопки ДДС/ОПиУ)
- `.section:not(.active)` (неактивные секции)
- `.print-btn` (сама кнопка)
- `#overlay`, `#drillPanel` (drill-down)
- `#stateLoading`, `#stateError`, `#stateEmpty`

### Показать при печати

- Активная секция `.section.active` — `display: block`
- Заголовок страницы (title или `<h1>` если есть)

### Дополнительно

```css
@media print {
  body { background: #fff; }
  .summary-tbl th, .summary-tbl td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

Флаг `print-color-adjust: exact` необходим — браузеры по умолчанию убирают фоновые цвета при печати.

---

## Scope

- Файл: `dds.html` — CSS, HTML-секции, JS (`buildSummaryData`, `renderSummaryCell`, `renderSummaryMatrix`)
- GAS: не затрагивается
- Другие дашборды: не затрагиваются
