# ОПиУ Dashboard — Design Spec
**Date:** 2026-03-22
**Status:** Approved

---

## Overview

Create a new standalone page `opiu.html` — a Profit & Loss dashboard for Daracom. The page shows a full P&L table broken down by store for any selected month, with all detail articles always expanded and % of revenue shown per cell.

---

## Pages & Files Affected

| File | Change |
|------|--------|
| `opiu.html` | New page (light theme, like `dds.html`) |
| `gas/dashboard.gs` | Add `?action=opiu&month=N` endpoint |
| `dashboard.html` | Add `ОПиУ →` button in header next to `ДДС →` |
| `dds.html` | Add `ОПиУ →` button in header next to `← Финотчёт` |

---

## Data Source

- **Spreadsheet:** `1Z6KR6NK2Y86QrQ2aLW-vRk44yP98OMU0mxzNakw8v_s` (ОПиУ 2026)
- **Sheets used:** `1`–`12` (by month number as string)
- **Sheet structure (0-based col indices):**
  - Row 0: headers — col 0 = "Источники", col 1 = "", cols 2-10 = store names, col 12 = "Итого"
  - Col 1 (B): metric label for each data row
  - Store cols: `[2, 3, 4, 5, 6, 7, 8, 9, 10]` → Астана, Above Астана, Мира, Есентай, Абайка, Above, Восход, Kaspi, Online
  - Total col: `12` (Итого)
  - Col 11 is unused/empty — skip it

---

## GAS Endpoint: `?action=opiu&month=N`

Added to `gas/dashboard.gs`. Reads sheet `N` from the ОПиУ spreadsheet.

### Row classification

The GAS script reads all rows from the sheet (starting row index 1, skipping row 0 headers). Each row is classified by its label in col B (index 1):

**Group rows** — exact string match against this fixed list:
```
'Выручка'
'Переменные'
'Маржинальный доход'
'Прямые постоянные'
'Валовая прибыль по направлениям'
```

**Item rows** — rows where col B is non-empty AND does not match any group label AND has at least one non-zero value in store/total cols.

**Skip rows** — all other rows: empty col B, or all store+total values are 0 or empty, or col B matches labels like "Производственные расходы" (section dividers with no store-level data).

The parser tracks current `parentGroup` as it scans rows sequentially. When a group row is encountered, `parentGroup` updates. Subsequent item rows are assigned that parent.

### Parent group boundaries

- Items after "Выручка" and before "Переменные" → parent = "Выручка"
- Items after "Переменные" and before "Маржинальный доход" → parent = "Переменные"
- Items after "Прямые постоянные" and before "Валовая прибыль по направлениям" → parent = "Прямые постоянные"
- "Маржинальный доход" and "Валовая прибыль по направлениям" have no item children

### Response shape

```json
{
  "ok": true,
  "data": {
    "month": 3,
    "stores": ["Магазин Астана", "Магазин Above Астана", "Магазин Мира", "Магазин Есентай", "Магазин Абайка", "Магазин Above", "Магазин Восход", "Магазин Kaspi", "Online Продажи"],
    "rows": [
      { "label": "Выручка", "type": "group", "parent": null, "values": { "Магазин Астана": 45200000, "Итого": 285542675 } },
      { "label": "Продажи товаров", "type": "item", "parent": "Выручка", "values": { ... } },
      { "label": "Возвраты товаров", "type": "item", "parent": "Выручка", "values": { ... } },
      { "label": "Переменные", "type": "group", "parent": null, "values": { ... } },
      { "label": "Закупка товара", "type": "item", "parent": "Переменные", "values": { ... } },
      ...
    ]
  }
}
```

Values are raw numbers (no string formatting). Positive = income, negative = expense (preserve sign).

**GAS error response shape** (same as existing endpoints in `dashboard.gs`):
```json
{ "ok": false, "error": "Лист 5 не найден" }
```
If sheet N does not exist or has unexpected structure, return `ok: false` with a descriptive error string. Frontend error state displays this message.

---

## opiu.html — Page Structure

### Theme
Light theme matching `dds.html`: `#F8F9FC` background, white cards, `#111827` text, Manrope font, Tailwind CSS.

### Header
```
[ ОПиУ · Daracom ]  [ "Март 2026" ]    [ ← Финотчёт ]  [ ↻ Обновить ]  [ month select ]
```

Navigation in header (right side):
- `← Финотчёт` → `dashboard.html`
- `ДДС →` → `dds.html`
- `↻ Обновить` — clears localStorage cache for current month, calls `loadData(true)`
- Month `<select>` with options 1–12 (Январь–Декабрь), defaults to current month

### Default month on load
`new Date().getMonth() + 1` — current calendar month. Same logic as `dds.html`.

### Loading / Error / Empty states
Follow the exact same pattern as `dds.html`:
- Loading: centered spinner + "Загрузка данных ОПиУ…"
- Error: ⚠️ icon + message + "Повторить" button
- Empty: 📭 icon + "Нет данных за выбранный месяц"

### Main: P&L Table

Full-width, horizontally scrollable wrapper. Sticky first column (metric name).

**Columns:** Метрика | Астана | Above Астана | Мира | Есентай | Абайка | Above | Восход | Kaspi | Online | **Итого**

**Row rendering:**

| Row type | Appearance |
|----------|-----------|
| Group row | Bold, font-size 13px, light tinted background, separator line above |
| Item row | Normal weight, font-size 12px, `padding-left: 20px`, white background |

**Group row background tints — static by label, not dynamic by sign:**
- Выручка → `rgba(16,185,129,0.08)` (green) — income
- Переменные → `rgba(239,68,68,0.08)` (red) — expense
- Маржинальный доход → `rgba(16,185,129,0.08)` (green) — income
- Прямые постоянные → `rgba(239,68,68,0.08)` (red) — expense
- Валовая прибыль по направлениям → `rgba(16,185,129,0.08)` (green) — income

Color is fixed by label regardless of whether the actual value is positive or negative.

**Cell content:**

Each value cell shows:
```
45.2 млн
(71%)        ← muted gray text, font-size 11px
```

Monetary values formatted with `fmtShort()` — copy the existing function from `dds.html` verbatim (млрд/млн/тыс ₸ suffixes, Math.abs for display, sign handled separately).

**% of revenue rules:**

- % = `value / revenueForColumn × 100`
- `revenueForColumn` = the "Выручка" group row value for that same column
- **No % shown for:** rows where `parent === 'Выручка'` OR `label === 'Выручка'` (Выручка group row itself + its sub-items Продажи/Возвраты)
- **% shown for:** all other rows — Переменные group (parent=null) + its items, Маржинальный доход (parent=null), Прямые постоянные (parent=null) + its items, Валовая прибыль (parent=null). For all these, denominator = Выручка group row value for that column.
- **Division by zero** (revenueForColumn === 0): show `—` instead of monetary value and skip %
- **Negative %**: display as-is (e.g., `-71%`) — expenses are negative by nature
- **Итого column**: % uses Итого Выручка as denominator (same rule)

**Zero values:** Show `—` (em dash) instead of `0` or `0 ₸`.

**Separators:** `border-top: 2px solid #E5E7EB` above each group row.

---

## Caching

Key: `daracom_opiu_${year}_${month}` where `year = new Date().getFullYear()`, TTL: 30 min. Year is included to prevent January 2027 from returning cached January 2026 data.
`↻ Обновить` explicitly calls `localStorage.removeItem('daracom_opiu_' + currentMonth)` then calls `loadData(true)` — bypasses cache entirely for this request.

---

## Deployment

- GAS changes go into `dashboard.gs` → deploy via existing dashboard deployment ID (`AKfycbyukzkRocAiDyYN2CVQcuVi2FXDUOOjL4qofWMnoK3PaiEpaqF3ojpE2u0JsKEYFwYprA`)
- `opiu.html` is a static page — pushed to GitHub Pages via `git push origin main`

---

## Out of Scope

- Dynamics/trend chart (month-over-month)
- Store filter / direction filter
- Export to CSV/PDF
- KPI cards
