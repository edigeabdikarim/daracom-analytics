# ОПиУ Matrix Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать таблицу `opiu.html` с плоской структуры на 2-уровневую матрицу по образцу «Сводной ДДС» — те же данные из GAS, новая визуальная иерархия и печать.

**Architecture:** Клиентский маппинг без изменений GAS. `OPIU_ROW_CONFIG` классифицирует строки по типу (l0/l1/l2/calc/article). При итерации отслеживается `currentL2` — он определяет company-wide статус статей. Старые CSS-классы (`pl-*`) и рендер-функции (`renderRow`, `buildCell`) заменяются новыми (`om-*`, `renderOpiuMatrix`).

**Tech Stack:** Vanilla JS, Tailwind CSS (CDN), inline `<style>`, Google Apps Script Web App (без изменений).

**Spec:** `docs/superpowers/specs/2026-04-01-opiu-matrix-design.md`

---

## Файлы

| Действие | Файл | Что меняется |
|----------|------|-------------|
| Modify | `opiu.html` | CSS, JS-константы, рендер-функции, HTML-обёртка, печать |

GAS не трогаем.

---

## Task 1: CSS — заменить старые `pl-*` на новые `om-*` классы

**Files:**
- Modify: `opiu.html` — секция `<style>`

Удаляем весь блок `/* ── P&L Table ── */` и всё что ниже него (до закрывающего `</style>`). Вставляем новый CSS.

- [ ] **Шаг 1: Заменить CSS-блок**

Найти в `opiu.html` строку `/* ── P&L Table ── */` (≈строка 38). Удалить весь CSS от неё до `</style>`. Вставить:

```css
    /* ── ОПиУ Matrix Table ── */
    .om-wrap { overflow-x: auto; background: #fff; border: 2px solid #1E3A5F; border-radius: 12px; }
    .om-table { width: 100%; border-collapse: collapse; font-size: 12px; border: 2px solid #1E3A5F; }

    /* Header */
    .om-table th { padding: 9px 10px; text-align: right; font-size: 11px; font-weight: 700;
      color: #fff; background: #1E3A5F; text-transform: uppercase; letter-spacing: 0.04em;
      border: 1px solid #2d4e73; white-space: nowrap; position: sticky; top: 0; z-index: 3; }
    .om-table th.om-th-metric { text-align: left; position: sticky; left: 0; z-index: 4;
      width: 220px; min-width: 220px; background: #1E3A5F; border-left: 2px solid #1E3A5F; }
    .om-table th.om-th-total { position: sticky; left: 220px; z-index: 4;
      background: #15803D; border-color: #166534; }

    /* Cells */
    .om-table td { padding: 8px 10px; border: 1px solid #9CA3AF; text-align: right; white-space: nowrap; color: #111827; }
    .om-table td:first-child { text-align: left; position: sticky; left: 0; background: #fff;
      z-index: 1; width: 220px; max-width: 280px; white-space: normal; word-break: break-word;
      border-left: 2px solid #1E3A5F; }
    .om-table td:last-child { border-right: 2px solid #1E3A5F; }
    .om-table td.om-td-total { position: sticky; left: 220px; z-index: 1; font-weight: 700;
      background: #fff; border-left: 2px solid #D1FAE5; border-right: 2px solid #D1FAE5; }
    .om-table td.om-cw-cell { text-align: center; }

    /* L0 row — Выручка */
    .om-l0-row td { background: #1E3A5F !important; color: #fff; font-weight: 700;
      font-size: 13px; border-top: 2px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-l0-row td:first-child { padding-left: 12px; background: #1E3A5F !important; }
    .om-l0-row td.om-td-total { background: #15803D !important; }

    /* L1 row — Производственные, Косвенные */
    .om-l1-row td { background: #162D4A !important; color: #fff; font-weight: 700;
      font-size: 13px; border-top: 3px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-l1-row td:first-child { padding-left: 12px; background: #162D4A !important; }
    .om-l1-row td.om-td-total { background: #0F4C2A !important; }

    /* L2 row — подгруппы */
    .om-l2-row td { background: #FFF7ED !important; color: #7C2D12; font-weight: 700;
      font-size: 12px; border-top: 2px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-l2-row td:first-child { padding-left: 20px; background: #FFF7ED !important; }
    .om-l2-row td.om-td-total { background: #FEF3C7 !important; }

    /* Calc rows — Маржинальный доход, Валовая прибыль, etc */
    .om-calc-row td { background: #ECFDF5 !important; color: #065F46; font-weight: 700;
      font-size: 13px; border-top: 3px solid #1E3A5F; border-bottom: 2px solid #1E3A5F; }
    .om-calc-row td:first-child { padding-left: 12px; background: #ECFDF5 !important; }
    .om-calc-row td.om-td-total { background: #D1FAE5 !important; }

    /* Article rows */
    .om-article-row td { background: #fff; }
    .om-article-row td:first-child { padding-left: 28px; font-size: 12px; font-weight: 400;
      color: #374151; background: #fff; }
    .om-article-row.om-alt td { background: #F9FAFB; }
    .om-article-row.om-alt td:first-child { background: #F9FAFB; }
    .om-article-row.om-alt td.om-td-total { background: #F0FDF4; }
    .om-article-row td.om-td-total { background: #F0FDF4; }
    .om-table tr.om-article-row:hover td { background: #F0F9FF !important; }
    .om-table tr.om-article-row:hover td.om-td-total { background: #DCFCE7 !important; }

    /* Value + pct */
    .om-val { font-weight: 600; }
    .om-val.om-positive { color: inherit; }
    .om-val.om-negative { color: #DC2626; }
    .om-pct { font-size: 10px; color: #9CA3AF; margin-top: 1px; }
    .om-pct-total { font-size: 10px; color: #6EE7B7; margin-top: 1px; }
    .om-zero { color: #D1D5DB; }

    /* Print header */
    #opiuPrintHeader { display: none; margin-bottom: 12px; }
    .ph-title { font-size: 14px; font-weight: 700; color: #111827; }
    .ph-month { font-size: 13px; color: #6B7280; margin-left: 8px; }

    /* Print */
    .print-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px;
      font-size: 13px; font-weight: 500; color: #374151; background: #F3F4F6;
      border: 1px solid #D1D5DB; border-radius: 6px; cursor: pointer;
      transition: background 0.15s; font-family: 'Manrope', sans-serif; }
    .print-btn:hover { background: #E5E7EB; }
    @page { size: A4 landscape; margin: 1cm; }
    @media print {
      header, .print-btn { display: none !important; }
      #opiuPrintHeader { display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #stateContent { padding: 0 !important; }
      .om-wrap { overflow: visible !important; border: none !important; border-radius: 0 !important; }
      .om-table thead { display: table-header-group; }
      .om-table th, .om-table td { position: static !important; }
      .om-table th, .om-table td,
      .om-l0-row td, .om-l1-row td, .om-l2-row td, .om-calc-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { @bottom-right { content: "Стр. " counter(page); font-size: 9pt; color: #9CA3AF; } }
    }
```

- [ ] **Шаг 2: Проверить в браузере**

Открыть `opiu.html` → таблица сломана (старый JS ещё пишет `pl-*` классы) — это ожидаемо. Убедиться что страница открывается без JS-ошибок в консоли.

- [ ] **Шаг 3: Коммит**

```bash
git add opiu.html
git commit -m "style(opiu): replace pl-* CSS with om-* matrix classes"
```

---

## Task 2: JS — константы `OPIU_ROW_CONFIG` и `MONTH_NAMES`

**Files:**
- Modify: `opiu.html` — первый `<script>` блок (КОНФИГУРАЦИЯ)

- [ ] **Шаг 1: Заменить блок КОНФИГУРАЦИЯ**

Найти в `opiu.html` секцию `<!-- ═══ КОНФИГУРАЦИЯ ═══ -->`. Заменить весь `<script>` блок на:

```html
  <!-- ═══ КОНФИГУРАЦИЯ ═══ -->
  <script>
    const CONFIG = {
      GAS_URL: 'https://script.google.com/macros/s/AKfycbyukzkRocAiDyYN2CVQcuVi2FXDUOOjL4qofWMnoK3PaiEpaqF3ojpE2u0JsKEYFwYprA/exec',
      CACHE_TTL_MS: 30 * 60 * 1000,
    };
    const CACHE_YEAR = new Date().getFullYear();
    const MONTH_NAMES = ['','Январь','Февраль','Март','Апрель','Май','Июнь',
                          'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

    const OPIU_ROW_CONFIG = {
      l0: new Set(['Выручка']),
      l1: {
        'Производственные расходы': { colorType: 'expense' },
        'Косвенные расходы':        { colorType: 'expense', companyWide: true }
      },
      l2: {
        'Переменные':           { companyWide: false, l1: 'Производственные расходы' },
        'Прямые постоянные':    { companyWide: false, l1: 'Производственные расходы' },
        'Общепроизводственные': { companyWide: true,  l1: 'Производственные расходы' },
        'Административные':     { companyWide: true,  l1: 'Косвенные расходы' },
        'Коммерческие':         { companyWide: true,  l1: 'Косвенные расходы' },
      },
      calc: new Set([
        'Маржинальный доход',
        'Валовая прибыль по направлениям',
        'Валовая прибыль',
        'Операционная прибыль (EBITDA)'
      ])
    };
  </script>
```

- [ ] **Шаг 2: Проверить — нет ошибок в консоли браузера**

Открыть DevTools → Console. Убедиться что `OPIU_ROW_CONFIG` определён: вписать в консоль `OPIU_ROW_CONFIG.l2['Переменные']` → должно вернуть `{companyWide: false, l1: 'Производственные расходы'}`.

- [ ] **Шаг 3: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): add OPIU_ROW_CONFIG classification constant"
```

---

## Task 3: JS — хелперы `classifyRow`, `buildOpiuCell`

**Files:**
- Modify: `opiu.html` — основной `<script>` блок (после `<!-- ═══ STATES ═══ -->`)

- [ ] **Шаг 1: Добавить хелперы в начало основного `<script>` блока**

Найти строку `// ─── STATE ─────────────────────────────────────`. Вставить перед ней:

```js
  // ─── КЛАССИФИКАЦИЯ ─────────────────────────────
  function classifyRow(label) {
    if (OPIU_ROW_CONFIG.l0.has(label))   return 'l0';
    if (OPIU_ROW_CONFIG.l1[label])       return 'l1';
    if (OPIU_ROW_CONFIG.l2[label])       return 'l2';
    if (OPIU_ROW_CONFIG.calc.has(label)) return 'calc';
    return 'article';
  }

  function isCompanyWide(type, label, currentL2) {
    if (type === 'l2')      return OPIU_ROW_CONFIG.l2[label]?.companyWide === true;
    if (type === 'l1')      return OPIU_ROW_CONFIG.l1[label]?.companyWide === true;
    if (type === 'article') return currentL2 ? (OPIU_ROW_CONFIG.l2[currentL2]?.companyWide === true) : false;
    if (type === 'calc')    return false; // для calc используем row.merged
    return false;
  }

  // ─── ЯЧЕЙКА ────────────────────────────────────
  function buildOpiuCell(val, revenue, isTotalCol) {
    if (val === null || val === undefined || val === 0) {
      return '<span class="om-zero">—</span>';
    }
    const fmtVal = fmtShort(val);
    const negCls = val < 0 ? ' om-negative' : '';
    let html = '<div class="om-val' + negCls + '">' + fmtVal + '</div>';
    if (revenue && Math.abs(revenue) > 0.01) {
      const pct = (Math.abs(val) / Math.abs(revenue) * 100).toFixed(1);
      const pctCls = isTotalCol ? 'om-pct-total' : 'om-pct';
      html += '<div class="' + pctCls + '">(' + pct + '%)</div>';
    }
    return html;
  }
```

- [ ] **Шаг 2: Проверить в консоли браузера**

```js
classifyRow('Выручка')                  // → 'l0'
classifyRow('Переменные')               // → 'l2'
classifyRow('Маржинальный доход')       // → 'calc'
classifyRow('Закупка товара')           // → 'article'
isCompanyWide('article', 'x', 'Административные')  // → true
isCompanyWide('article', 'x', 'Переменные')        // → false
```

- [ ] **Шаг 3: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): add classifyRow, isCompanyWide, buildOpiuCell helpers"
```

---

## Task 4: JS — `renderOpiuRow`

**Files:**
- Modify: `opiu.html` — основной `<script>` блок

- [ ] **Шаг 1: Добавить функцию после хелперов**

Вставить после `buildOpiuCell` (перед `// ─── STATE`):

```js
  // ─── РЕНДЕР СТРОКИ ─────────────────────────────
  function renderOpiuRow(row, type, stores, totalRevenue, storeRevenue, currentL2, artIdx) {
    const label  = row.label;
    const values = row.values;
    const totalVal = values ? values['Итого'] : null;

    // company-wide: для calc используем row.merged, для остальных — isCompanyWide()
    const cw = (type === 'calc') ? !!row.merged : isCompanyWide(type, label, currentL2);

    // CSS класс строки
    const rowCls = {
      l0: 'om-l0-row', l1: 'om-l1-row', l2: 'om-l2-row',
      calc: 'om-calc-row',
      article: 'om-article-row' + (artIdx % 2 === 1 ? ' om-alt' : '')
    }[type] || 'om-article-row';

    // Отступ для статей
    const indent = type === 'article' ? ' style="padding-left:28px"' : '';

    // Итого-ячейка
    const totalCell = '<td class="om-td-total">' + buildOpiuCell(totalVal, totalRevenue, true) + '</td>';

    let tr = '<tr class="' + rowCls + '">';
    tr += '<td' + indent + '>' + escHtml(label) + '</td>';
    tr += totalCell;

    if (cw) {
      // Company-wide: colspan по всем направлениям
      tr += '<td colspan="' + stores.length + '" class="om-cw-cell">'
          + buildOpiuCell(totalVal, totalRevenue, false) + '</td>';
    } else {
      // Per-direction
      stores.forEach(function(s) {
        const val = values ? values[s] : null;
        const rev = storeRevenue[s] || 0;
        tr += '<td>' + buildOpiuCell(val, rev, false) + '</td>';
      });
    }

    tr += '</tr>';
    return tr;
  }
```

- [ ] **Шаг 2: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): add renderOpiuRow function"
```

---

## Task 5: JS — `computeL1Total` и `renderOpiuMatrix`

**Files:**
- Modify: `opiu.html` — основной `<script>` блок

- [ ] **Шаг 1: Добавить `computeL1Total` и `renderOpiuMatrix` после `renderOpiuRow`**

```js
  // ─── L1 ИТОГО ──────────────────────────────────
  // Вычисляет Итого для L1-группы как сумму её L2-подгрупп.
  // Возвращает объект values { 'Итого': N, 'Магазин Астана': N, ... }
  function computeL1Total(l1Label, rowByLabel, stores) {
    // Находим все L2, принадлежащие этому L1
    var l2Names = Object.keys(OPIU_ROW_CONFIG.l2).filter(function(k) {
      return OPIU_ROW_CONFIG.l2[k].l1 === l1Label;
    });
    var values = { 'Итого': 0 };
    stores.forEach(function(s) { values[s] = 0; });

    l2Names.forEach(function(l2name) {
      var l2row = rowByLabel[l2name];
      if (!l2row || !l2row.values) return;
      values['Итого'] += l2row.values['Итого'] || 0;
      // Per-direction L2 вносят вклад в per-direction L1
      if (!OPIU_ROW_CONFIG.l2[l2name].companyWide) {
        stores.forEach(function(s) { values[s] += l2row.values[s] || 0; });
      }
    });
    return values;
  }

  // ─── РЕНДЕР МАТРИЦЫ ────────────────────────────
  function renderOpiuMatrix(data) {
    var stores = data.stores;
    var rows   = data.rows;

    // Индекс строк по лейблу для быстрого доступа
    var rowByLabel = {};
    rows.forEach(function(r) { rowByLabel[r.label] = r; });

    // База для % — строка Выручка
    var revRow       = rowByLabel['Выручка'];
    var totalRevenue = revRow ? (revRow.values['Итого'] || 0) : 0;
    var storeRevenue = {};
    stores.forEach(function(s) {
      storeRevenue[s] = revRow ? (revRow.values[s] || 0) : 0;
    });

    // Thead
    var html = '<table class="om-table"><thead><tr>';
    html += '<th class="om-th-metric">Метрика</th>';
    html += '<th class="om-th-total" style="text-align:right">Итого</th>';
    stores.forEach(function(s) {
      html += '<th style="text-align:right">' + escHtml(s.replace('Магазин ', '')) + '</th>';
    });
    html += '</tr></thead><tbody>';

    // Контекст итерации
    var currentL2  = null;
    var artIdx     = 0;  // счётчик для чередования строк в текущей L2-группе

    rows.forEach(function(row) {
      var label = row.label;
      var type  = classifyRow(label);

      // Обновляем контекст
      if (type === 'l2')      { currentL2 = label; artIdx = 0; }
      if (type === 'l0' || type === 'l1' || type === 'calc') { artIdx = 0; }
      if (type === 'article') { artIdx++; }

      // Для L1-групп: если в GAS нет значений — вычисляем
      var rowToRender = row;
      if (type === 'l1' && (!row.values || row.values['Итого'] === 0)) {
        var computed = computeL1Total(label, rowByLabel, stores);
        rowToRender = Object.assign({}, row, { values: computed });
      }

      html += renderOpiuRow(rowToRender, type, stores, totalRevenue, storeRevenue, currentL2, artIdx);
    });

    html += '</tbody></table>';
    return html;
  }
```

- [ ] **Шаг 2: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): add computeL1Total and renderOpiuMatrix"
```

---

## Task 6: Подключить `renderOpiuMatrix` — заменить старый рендер

**Files:**
- Modify: `opiu.html` — функция `renderDashboard`, HTML-обёртка

- [ ] **Шаг 1: Обновить HTML-обёртку таблицы**

Найти в HTML:
```html
  <main id="stateContent" class="hidden px-6 py-6 max-w-screen-2xl mx-auto">
    <div class="pl-wrap">
      <table class="pl-table" id="plTable">
        <thead id="plHead"></thead>
        <tbody id="plBody"></tbody>
      </table>
    </div>
  </main>
```

Заменить на:
```html
  <main id="stateContent" class="hidden px-6 py-6 max-w-screen-2xl mx-auto">
    <div id="opiuPrintHeader">
      <span class="ph-title">ОПиУ · Daracom — Матрица</span>
      <span class="ph-month" id="printMonth"></span>
    </div>
    <div class="om-wrap" id="opiuMatrixWrap"></div>
  </main>
```

- [ ] **Шаг 2: Заменить `renderDashboard`**

Найти всю функцию `function renderDashboard(data, ts)` (строки ≈262–297). Заменить:

```js
  function renderDashboard(data, ts) {
    if (!data || !data.rows || data.rows.length === 0) {
      setState('empty');
      return;
    }
    currentData = data;

    // Подзаголовок header
    const d = new Date(ts);
    const hhmm = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    document.getElementById('headerSub').textContent =
      MONTH_NAMES[data.month] + ' ' + CACHE_YEAR + ' · данные от ' + hhmm;

    // Печатный заголовок
    const pm = document.getElementById('printMonth');
    if (pm) pm.textContent = '· ' + MONTH_NAMES[data.month] + ' ' + CACHE_YEAR;

    // Рендер матрицы
    const wrap = document.getElementById('opiuMatrixWrap');
    wrap.innerHTML = renderOpiuMatrix(data);

    setState('content');
  }
```

- [ ] **Шаг 3: Удалить старые функции и дублирующую константу**

Найти и удалить:
1. `const CACHE_YEAR = new Date().getFullYear();` — из основного `<script>` блока (строка ≈189). Она теперь в CONFIG-блоке, дубль вызовет `SyntaxError: Identifier already declared`.
2. Функцию `renderRow(row, cols, revenueMap)` — больше не используется.
3. Функцию `buildCell(val, rev, noPercent, isPct, isTotal, isMerged)` — больше не используется.

- [ ] **Шаг 4: Проверить в браузере**

Открыть `opiu.html`, выбрать месяц с данными → таблица должна отрисоваться с новой иерархией. Проверить:
- Строка «Выручка» — тёмно-синий фон
- Строка «Переменные» — янтарный фон, отступ
- Строка «Маржинальный доход» — зелёный фон
- Company-wide статьи (Общепроизводственные) — colspan по направлениям с % под значением
- Sticky: первая колонка и Итого при горизонтальном скролле

- [ ] **Шаг 5: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): wire renderOpiuMatrix, remove old renderRow/buildCell"
```

---

## Task 7: Кнопка «Печать» в header + проверка печати

**Files:**
- Modify: `opiu.html` — секция `<!-- ═══ HEADER ═══ -->`

- [ ] **Шаг 1: Добавить кнопку печати в header**

Найти в header:
```html
      <button onclick="refreshData()" class="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-500 hover:text-green-600 text-gray-600 transition-colors">↻ Обновить</button>
```

Вставить перед этой кнопкой:
```html
      <button onclick="window.print()" class="print-btn">🖨 Печать</button>
```

- [ ] **Шаг 2: Проверить печать**

Нажать кнопку «🖨 Печать» → Print Preview должен показать:
- Заголовок «ОПиУ · Daracom — Матрица · [Месяц] 2026» вверху страницы
- Таблица с повторяющимся thead на каждой странице
- Нет sidebar / nav / кнопок
- Цвета строк сохранены (print-color-adjust)
- Номер страницы внизу справа

- [ ] **Шаг 3: Коммит**

```bash
git add opiu.html
git commit -m "feat(opiu): add print button and print header"
```

---

## Task 8: Deploy — git push → GitHub Pages

- [ ] **Шаг 1: Финальная проверка**

Открыть `opiu.html`, проверить 3 месяца с данными. Убедиться:
- L1-группы показывают сумму L2 (если строки нет в GAS — вычислено в JS)
- Расчётные строки в порядке из листа
- % отображаются везде (включая company-wide colspan ячейки)
- Нет JS-ошибок в консоли

- [ ] **Шаг 2: Push**

```bash
git push origin main
```

- [ ] **Шаг 3: Проверить GitHub Pages**

Открыть `https://edigeabdikarim.github.io/daracom-analytics/opiu.html`. Подождать ≈1 мин если страница не обновилась (GitHub Pages CDN cache).

---

## Примечания по реализации

**Если L1-строка (Производственные расходы / Косвенные расходы) отсутствует в GAS-данных:**
`computeL1Total` вычислит значения из L2-подгрупп. Если строка ЕСТЬ в GAS но с нулевым Итого — тоже пересчитаем. Таким образом оба случая покрыты.

**Если расчётная строка (Валовая прибыль, Операционная прибыль) отсутствует в GAS:**
`renderOpiuMatrix` просто не встретит её при итерации — строка не будет показана. Если нужна заглушка — добавить явный расчёт в JS после итерации (не в скоупе этого плана, только если реально нужно).

**Дублирующиеся лейблы («Зарплата Техперсонал», «Телекоммуникации»):**
Обрабатываются через `currentL2` — статья получает company-wide статус от своей L2-группы, а не от лейбла.
