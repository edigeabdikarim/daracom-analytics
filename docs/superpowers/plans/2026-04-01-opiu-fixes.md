# ОПиУ — фиксы company-wide, удаление строк, цвета, проценты

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить отображение ОПиУ: company-wide строки, удалить строки рентабельности и всё ниже EBITDA, убрать цветные фоны, сделать контрастные тексты, починить знак у процентов.

**Architecture:** Все изменения только в `opiu.html` — JS-конфиг и CSS. GAS не трогаем. Изменения сгруппированы по смыслу: конфиг → рендер → CSS.

**Tech Stack:** Vanilla JS, Tailwind CDN, inline CSS в `<style>`, `opiu.html`

**Spec:** `docs/superpowers/specs/2026-04-01-opiu-fixes-design.md`

---

## Файлы

| Файл | Изменения |
|---|---|
| `opiu.html` | Единственный файл. Задачи 1–4. |

---

### Задача 1: Company-wide для «Производственные расходы» и CALC-строк

**Файлы:**
- Modify: `opiu.html` — блок `OPIU_ROW_CONFIG` (~строки 140–159), функция `isCompanyWide` (~строки 221–227)

- [ ] **Шаг 1.1: Добавить `companyWide: true` для «Производственные расходы»**

В `OPIU_ROW_CONFIG.l1` (примерно строка 143) заменить:
```js
'Производственные расходы': { colorType: 'expense' },
```
на:
```js
'Производственные расходы': { colorType: 'expense', companyWide: true },
```

- [ ] **Шаг 1.2: Добавить `calcCW` — множество company-wide CALC строк**

После строки `calc: new Set([...])` (примерно строка 153–158) добавить новое поле:
```js
      calc: new Set([
        'Маржинальный доход',
        'Валовая прибыль по направлениям',
        'Валовая прибыль',
        'Операционная прибыль (EBITDA)'
      ]),
      calcCW: new Set([
        'Валовая прибыль',
        'Операционная прибыль (EBITDA)'
      ])
```

- [ ] **Шаг 1.3: Обновить `isCompanyWide` для calc-типа**

В функции `isCompanyWide` (~строка 225) заменить:
```js
    if (type === 'calc')    return false; // для calc используем row.merged
```
на:
```js
    if (type === 'calc')    return OPIU_ROW_CONFIG.calcCW.has(label);
```

- [ ] **Шаг 1.4: Обновить `renderOpiuRow` — убрать row.merged для calc**

В функции `renderOpiuRow` (~строка 252) заменить:
```js
    const cw = (type === 'calc') ? !!row.merged : isCompanyWide(type, label, currentL2);
```
на:
```js
    const cw = isCompanyWide(type, label, currentL2);
```

- [ ] **Шаг 1.5: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): company-wide for Производственные расходы and EBITDA calc rows"
```

---

### Задача 2: Удалить строки рентабельности и всё ниже EBITDA

**Файлы:**
- Modify: `opiu.html` — блок `<script>` с конфигом (~строка 131), функция `renderOpiuMatrix` (~строки 309–361)

- [ ] **Шаг 2.1: Добавить константу OPIU_ROWS_SKIP**

После `OPIU_ROW_CONFIG` (примерно строка 159), в том же `<script>` блоке конфигурации, добавить:
```js
    const OPIU_ROWS_SKIP = new Set([
      'Рентабельность по маржинальному доходу, %',
      'Рентабельность по направлениям, %',
      'Рентабельность по валовой прибыли, %',
    ]);
```

- [ ] **Шаг 2.2: Добавить логику пропуска в renderOpiuMatrix**

В `renderOpiuMatrix`, в начале цикла `rows.forEach(function(row) {` (примерно строка 340), добавить перед строкой `var label = row.label`:

```js
    rows.forEach(function(row) {
      if (cutAfterEBITDA) return;
      var label = row.label;
      if (OPIU_ROWS_SKIP.has(label)) return;
```

И объявить флаг перед циклом (примерно строка 337, после `var artIdx = 0`):
```js
    var cutAfterEBITDA = false;
```

- [ ] **Шаг 2.3: Установить флаг после рендера EBITDA**

После строки `html += renderOpiuRow(...)` (примерно строка 356) добавить:
```js
      html += renderOpiuRow(rowToRender, type, stores, totalRevenue, storeRevenue, currentL2, artIdx);
      if (label === 'Операционная прибыль (EBITDA)') cutAfterEBITDA = true;
```

- [ ] **Шаг 2.4: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): remove rentabelnost rows and all rows after EBITDA"
```

---

### Задача 3: Расчёт и отображение процентов

**Файлы:**
- Modify: `opiu.html` — функция `buildOpiuCell` (~строки 230–243), CSS `.om-pct` и `.om-pct-total` (~строки 99–100)

- [ ] **Шаг 3.1: Починить знак процентов в buildOpiuCell**

В `buildOpiuCell` (~строка 238) заменить:
```js
      const pct = (Math.abs(val) / Math.abs(revenue) * 100).toFixed(1);
      const pctCls = isTotalCol ? 'om-pct-total' : 'om-pct';
      html += '<div class="' + pctCls + '">(' + pct + '%)</div>';
```
на:
```js
      const pct = (val / Math.abs(revenue) * 100).toFixed(1);
      html += '<div class="om-pct">(' + pct + '%)</div>';
```

Единый класс `om-pct` для всех колонок (убрать `om-pct-total`).

- [ ] **Шаг 3.2: Исправить CSS цвета процентов**

В блоке `<style>` (~строки 99–100) заменить:
```css
    .om-pct { font-size: 10px; color: #9CA3AF; margin-top: 1px; }
    .om-pct-total { font-size: 10px; color: #6EE7B7; margin-top: 1px; }
```
на:
```css
    .om-pct { font-size: 10px; color: #374151; margin-top: 1px; }
```

Строку `.om-pct-total { ... }` — удалить полностью.

- [ ] **Шаг 3.3: Починить om-zero**

В блоке `<style>` (~строка 101) заменить:
```css
    .om-zero { color: #D1D5DB; }
```
на:
```css
    .om-zero { color: #9CA3AF; }
```

- [ ] **Шаг 3.4: Коммит**

```bash
git add opiu.html
git commit -m "fix(opiu): percent sign, unified om-pct class, contrast text colors"
```

---

### Задача 4: Цвета таблицы — белый и бледно-серый

**Файлы:**
- Modify: `opiu.html` — блок `<style>` (~строки 38–125)

- [ ] **Шаг 4.1: Убрать зелёный цвет из om-th-total (thead)**

В CSS (~строка 49) заменить:
```css
    .om-table th.om-th-total { position: sticky; left: 220px; z-index: 4;
      background: #15803D; border-color: #166534; }
```
на:
```css
    .om-table th.om-th-total { position: sticky; left: 220px; z-index: 4;
      background: #1E3A5F; border-color: #2d4e73; }
```

- [ ] **Шаг 4.2: Убрать зелёный из om-td-total**

В CSS (~строка 57–58) заменить:
```css
    .om-table td.om-td-total { position: sticky; left: 220px; z-index: 1; font-weight: 700;
      background: #fff; border-left: 2px solid #D1FAE5; border-right: 2px solid #D1FAE5; }
```
на:
```css
    .om-table td.om-td-total { position: sticky; left: 220px; z-index: 1; font-weight: 700;
      background: #fff; border-left: 2px solid #E5E7EB; border-right: 2px solid #E5E7EB; }
```

- [ ] **Шаг 4.3: Перекрасить L0-строку (Выручка)**

В CSS (~строки 62–65) заменить весь блок `om-l0-row`:
```css
    /* L0 row — Выручка */
    .om-l0-row td { background: #E5E7EB !important; color: #111827; font-weight: 700;
      font-size: 13px; border-top: 2px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-l0-row td:first-child { padding-left: 12px; background: #E5E7EB !important; }
    .om-l0-row td.om-td-total { background: #E5E7EB !important; }
```

- [ ] **Шаг 4.4: Перекрасить L1-строки (группы)**

В CSS (~строки 68–71) заменить весь блок `om-l1-row`:
```css
    /* L1 row — Производственные, Косвенные */
    .om-l1-row td { background: #D1D5DB !important; color: #111827; font-weight: 700;
      font-size: 13px; border-top: 3px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-l1-row td:first-child { padding-left: 12px; background: #D1D5DB !important; }
    .om-l1-row td.om-td-total { background: #D1D5DB !important; }
```

- [ ] **Шаг 4.5: Перекрасить L2-строки (подгруппы)**

В CSS (~строки 74–77) заменить весь блок `om-l2-row`:
```css
    /* L2 row — подгруппы */
    .om-l2-row td { background: #F3F4F6 !important; color: #111827; font-weight: 700;
      font-size: 12px; border-top: 2px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-l2-row td:first-child { padding-left: 20px; background: #F3F4F6 !important; }
    .om-l2-row td.om-td-total { background: #F3F4F6 !important; }
```

- [ ] **Шаг 4.6: Перекрасить CALC-строки**

В CSS (~строки 80–83) заменить весь блок `om-calc-row`:
```css
    /* Calc rows — Маржинальный доход, Валовая прибыль, etc */
    .om-calc-row td { background: #EDF2FF !important; color: #111827; font-weight: 700;
      font-size: 13px; border-top: 3px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-calc-row td:first-child { padding-left: 12px; background: #EDF2FF !important; }
    .om-calc-row td.om-td-total { background: #EDF2FF !important; }
```

- [ ] **Шаг 4.7: Убрать зелёный hover и зелёные фоны из article-строк**

В CSS (~строки 86–94) заменить весь блок article-строк:
```css
    /* Article rows */
    .om-article-row td { background: #fff; }
    .om-article-row td:first-child { padding-left: 28px; font-size: 12px; font-weight: 400;
      color: #374151; background: #fff; }
    .om-article-row.om-alt td { background: #F9FAFB; }
    .om-article-row.om-alt td:first-child { background: #F9FAFB; }
    .om-article-row.om-alt td.om-td-total { background: #F9FAFB; }
    .om-article-row td.om-td-total { background: #fff; }
    .om-table tr.om-article-row:hover td { background: #F0F9FF !important; }
```

Строки с `om-td-total` в hover (если есть) — убрать отдельный цвет, пусть наследуется от hover `tr`.

- [ ] **Шаг 4.8: Коммит**

```bash
git add opiu.html
git commit -m "style(opiu): replace colored backgrounds with white/gray, remove green total column"
```

---

### Задача 5: Push и финальная проверка

- [ ] **Шаг 5.1: Push в main**

```bash
git push origin main
```

- [ ] **Шаг 5.2: Проверить в браузере**

Открыть `opiu.html` локально или на GitHub Pages. Проверить:
- «Производственные расходы» — одна ячейка на всю ширину (company-wide)
- «Операционная прибыль (EBITDA)» — одна ячейка на всю ширину
- «Маржинальный доход», «Валовая прибыль по направлениям» — колонки по магазинам
- Строки рентабельности отсутствуют
- После EBITDA строк нет
- Колонка Итого — без зелёного фона
- Строки Выручка/Производственные/Косвенные/Маржинальный доход — серые фоны (не тёмно-синие)
- Проценты — тёмный текст, отрицательные со знаком минус
