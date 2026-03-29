# Spec: Store Cards — Group Breakdown + Сводная Fix

**Date:** 2026-03-30
**Status:** Approved

## Overview

Two related changes in `dds.html`:
1. Move «Услуги банка» articles to «Налоги» group in «Сводная»
2. Redesign store cards in «По магазинам»: replace direction breakdown with article-group breakdown, rename income line to «Продажи»

---

## Change 1: «Сводная» — Article Group Reassignment

In `DDS_ARTICLES_ORDER`, move two articles from group `IT и офис` → `Налоги`:

- `Услуги банка`
- `Услуги банка Kaspi`

No other changes to `DDS_ARTICLES_ORDER` or `DDS_GROUP_TYPES`.

---

## Change 2: Store Cards Redesign

### 2a. Income line: «Поступления» → «Продажи»

The top income row in each store card changes:

| Field | Before | After |
|-------|--------|-------|
| Label | Поступления | Продажи |
| Value | Sum of all `r.type === 'Поступление'` rows | `salesTotal = Σ(r.amount where article ∈ Продажи AND type='Поступление') − Σ(Math.abs(r.amount) where article ∈ Продажи AND type='Выбытие')` |

In practice: `salesTotal = Продажи товаров − Возвраты товаров`.

The «Выбытия» row continues to show the total of all `r.type === 'Выбытие'` rows (unchanged, includes returns). «Чистый CF» = `d.inc − d.out` (unchanged — uses total поступления, not salesTotal), so `Продажи − Выбытия` may not equal CF if there are other income sources.

### 2b. % затрат denominator change

`% затрат = Выбытия / Продажи × 100`

Previously the denominator was total Поступления. Now it uses the Продажи value from 2a. The progress bar and 🟢<80% / 🟡80–99% / 🔴≥100% color scale remain unchanged.

Label under the bar changes: «Затраты от поступлений» → «Затраты от продаж»

### 2c. Breakdown section: directions → article groups

**Header:** «Выбытия по направлениям» → «Выбытия по группам»

**Data source:** Instead of grouping by `r.direction`, group by the article's group name from `DDS_ARTICLES_ORDER`.

**Lookup:** A shared constant `ARTICLE_GROUP` (a plain object `article → groupName`) is built once from `DDS_ARTICLES_ORDER` after it is declared. Articles not found in `DDS_ARTICLES_ORDER` → group `«Прочее»`.

**Excluded groups** (not shown in card breakdown):
- `Платежи`
- `Основные средства`
- `Финансирование`
- `Продажи` (already shown as income line above)

**Row visual (Variant A — same style as current):**
- Mini-bar width = `Math.min(groupAmt / totalOut * 100, 100)%` (share of total выбытия)
- Amount = `fmtShort(groupAmt)`
- % = `(groupAmt / salesTotal * 100).toFixed(0) + '%'` — **neutral gray color** (`#6B7280`), no 🟢🟡🔴 coloring
- Rows sorted descending by amount
- Only groups with `amount > 0` are shown

**Legend removed:** The 🟢🟡🔴 legend below the breakdown is removed (it was tied to per-row color coding which is now gone).

---

## Implementation Notes

- All changes are in `dds.html` only — no GAS changes.
- `ARTICLE_GROUP` lookup object is declared once at module level after `DDS_ARTICLES_ORDER`, reused by both `renderStoreGrid()` and potentially `buildSummaryData()` in the future.
- `renderStoreGrid()` must use `salesTotal` (Продажи group sum) as the denominator for % затрат and per-group % — not `d.inc`.
- Rows where `r.activity === 'Техническая операция'` continue to be excluded from store aggregation.
