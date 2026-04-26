# Сводная (печать) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить новую секцию «📄 Сводная (печать)» в dds.html — ЧБ-читабельный отчёт оптимизированный для печати с повторяющейся шапкой, блоком итогов, чипом CF и режимом «Только группы».

**Architecture:** Одна новая функция `renderSummaryPrint()` повторно использует `buildSummaryData()` и `calcKPI()`. Таблица строится с отдельным `<tbody>` на каждую группу расходов для `break-inside: avoid`. CSS-класс `sprint-tbl` полностью независим от `.summary-tbl`.

**Tech Stack:** Vanilla JS, HTML/CSS, без внешних зависимостей. Только `dds.html`.

---

## Файлы

- **Modify:** `dds.html` — единственный файл. Все изменения в нём.

---

### Task 1: CSS — новые стили `sprint-tbl` и print-rules

**Files:**
- Modify: `dds.html:228-268` (блок `@media print` и стили выше)

- [ ] **Step 1: Добавить CSS для `sprint-tbl` и секции `section-summary-print`**

Найти строку 268 (`}` — конец первого `@media print` блока). Вставить **после неё** (после строки 268, перед строкой 270 `/* ── ДДС Гульжан А.`):

```css
    /* ── Сводная (печать) — sprint-tbl ── */
    .sprint-tbl { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #111; }
    .sprint-tbl th { background: #fff; color: #111; padding: 6px 8px; text-align: right; font-weight: 700; white-space: nowrap; border: 1px solid #111; }
    .sprint-tbl th:first-child { text-align: left; min-width: 180px; }
    .sprint-tbl td { padding: 5px 8px; text-align: right; white-space: nowrap; border: 1px solid #D1D5DB; background: #fff; color: #111; }
    .sprint-tbl td:first-child { text-align: left; }
    .sprint-income td { font-weight: 700; border-top: 2px solid #111 !important; border-bottom: 2px solid #111 !important; }
    .sprint-expense td { font-weight: 700; background: #F3F4F6 !important; border-top: 2px solid #111 !important; }
    .sprint-article td { background: #fff; }
    .sprint-pct { color: #555; font-size: 10px; }
    .sprint-zero { color: #999; }
    .sprint-totals-bar { display: flex; border: 1px solid #111; border-radius: 6px; overflow: hidden; margin-bottom: 14px; }
    .sprint-total-cell { flex: 1; padding: 9px 14px; text-align: center; border-right: 1px solid #111; }
    .sprint-total-cell:last-child { border-right: none; }
    .sprint-total-label { font-size: 10px; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 3px; }
    .sprint-total-value { font-size: 14px; font-weight: 700; color: #111; }
    .sprint-mode-note { display: none; font-size: 11px; color: #555; font-style: italic; padding: 4px 0 10px; }
    body.sprint-compact .sprint-mode-note { display: block; }
    body.sprint-compact .sprint-income-body .sprint-article { display: table-row; } /* поступления всегда раскрыты */
    body.sprint-compact .sprint-expense-body .sprint-article { display: none; }
```

- [ ] **Step 2: Добавить print-правила для `section-summary-print` в существующий `@media print` блок**

В `@media print` (строки 229-268) после строки 263 (`.sma-last td { border-bottom-color: #1E3A5F !important; }`) добавить:

```css
      /* sprint print */
      #section-summary-print.active #sprintPrintHeader { display: block !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sprint-tbl thead { display: table-header-group; }
      .sprint-tbl th, .sprint-tbl td { position: static !important; }
      .sprint-tbl th, .sprint-tbl td, .sprint-expense td, .sprint-income td, .sprint-article td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tbody.sprint-expense-body { break-inside: avoid; page-break-inside: avoid; }
      body.sprint-compact .sprint-expense-body .sprint-article { display: none !important; }
```

- [ ] **Step 3: Проверить отсутствие синтаксических ошибок**

Открыть `dds.html` в браузере (`file://`). Страница должна загружаться без ошибок в консоли.

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "style(dds): add sprint-tbl CSS and print rules for summary-print section"
```

---

### Task 2: HTML — nav-пункт и section-summary-print

**Files:**
- Modify: `dds.html:344-346` (nav) и `dds.html:467-468` (после section-summary)

- [ ] **Step 1: Добавить nav-пункт**

После строки 346 (`</div>` — закрытие `nav-summary`):

```html
      <div class="nav-item" onclick="setSection('summary-print')" id="nav-summary-print">
        <span class="nav-icon">📄</span> Сводная (печать)
      </div>
```

- [ ] **Step 2: Добавить HTML-секцию**

После строки 467 (`</div>` — закрытие `section-summary`), перед строкой 469 (`<!-- ── РАЗДЕЛ: ДДС ГУЛЬЖАН А.`):

```html
      <!-- ── РАЗДЕЛ: СВОДНАЯ (ПЕЧАТЬ) ── -->
      <div class="section" id="section-summary-print">

        <!-- Print-шапка (скрыта на экране, видна при печати) -->
        <div id="sprintPrintHeader" style="display:none;padding-bottom:12px;border-bottom:2px solid #111;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:16px;font-weight:700;color:#111">ДДС · Daracom — Сводная по статьям и магазинам</div>
              <div style="font-size:12px;color:#555;margin-top:3px">Отчётный период: <span class="sprint-ph-month"></span></div>
            </div>
            <div style="border:1px solid #111;border-radius:6px;padding:7px 16px;text-align:center;min-width:190px">
              <div style="font-size:10px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Чистый Cash Flow (операционный)</div>
              <div class="sprint-ph-cf" style="font-size:14px;font-weight:700;color:#111;margin-top:2px">—</div>
            </div>
          </div>
        </div>

        <!-- Шапка секции (экран) -->
        <div class="flex items-center justify-between mb-4">
          <h2 class="section-title" style="margin-bottom:0">Сводная (печать)</h2>
          <div style="display:flex;align-items:center;gap:12px">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#6B7280;cursor:pointer;">
              <input type="checkbox" id="sprintCompactToggle" onchange="toggleSprintCompact()" style="accent-color:#374151;">
              Только группы
            </label>
            <button class="print-btn" onclick="window.print()">🖨️ Печать</button>
          </div>
        </div>

        <!-- Блок итогов -->
        <div id="sprintTotalsBar" class="sprint-totals-bar" style="display:none">
          <div class="sprint-total-cell">
            <div class="sprint-total-label">Итого поступлений</div>
            <div class="sprint-total-value" id="sprintTotalIncoming">—</div>
          </div>
          <div class="sprint-total-cell">
            <div class="sprint-total-label">Итого расходов</div>
            <div class="sprint-total-value" id="sprintTotalOutgoing">—</div>
          </div>
          <div class="sprint-total-cell">
            <div class="sprint-total-label">Чистый CF (опер.)</div>
            <div class="sprint-total-value" id="sprintTotalNet">—</div>
          </div>
        </div>

        <p class="sprint-mode-note">* Отображаются только итоги по группам. Подстатьи скрыты.</p>

        <!-- Таблица -->
        <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow-x:auto;" id="sprintWrap">
          <p style="padding:24px;color:#9CA3AF;text-align:center;">Выберите месяц для загрузки данных</p>
        </div>
      </div>
```

- [ ] **Step 3: Проверить в браузере**

Открыть `dds.html`. В сайдбаре должен появиться пункт «📄 Сводная (печать)». Кликнуть — секция открывается с плейсхолдером «Выберите месяц».

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(dds): add section-summary-print nav and HTML skeleton"
```

---

### Task 3: JS — функция `renderSummaryPrint()`

**Files:**
- Modify: `dds.html` — добавить функцию после `renderSummaryMatrix()` (строка ~1864)

- [ ] **Step 1: Добавить вспомогательную функцию `renderSprintCell()`**

Вставить после строки 1864 (после закрывающей `}` `renderSummaryMatrix`):

```js
// ── Сводная (печать) ─────────────────────────────────

function renderSprintCell(value) {
  if (Math.abs(value) < 0.01) return `<span class="sprint-zero">—</span>`;
  const formatted = new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(Math.abs(value)) + ' ₸';
  const sign = value < 0 ? '−' : '+';
  return `${sign}${formatted}`;
}

function renderSprintPct(value, totalIncome) {
  if (!totalIncome || Math.abs(value) < 0.01) return `<span class="sprint-zero">—</span>`;
  const pct = (Math.abs(value) / totalIncome * 100).toFixed(1);
  return `<span class="sprint-pct">${pct}%</span>`;
}
```

- [ ] **Step 2: Добавить `renderSummaryPrint()`**

Сразу после функций из шага 1:

```js
function renderSummaryPrint() {
  const wrap = document.getElementById('sprintWrap');
  if (!wrap) return;
  if (document.getElementById('stateContent').classList.contains('hidden')) return;
  if (!allRows || allRows.length === 0) {
    wrap.innerHTML = `<p style="padding:24px;color:#9CA3AF;text-align:center;">Нет данных за ${escHtml(MONTH_NAMES[currentMonth - 1])}</p>`;
    return;
  }

  const { stores, groups, totalIncome } = buildSummaryData(allRows);
  if (stores.length === 0) {
    wrap.innerHTML = `<p style="padding:24px;color:#9CA3AF;text-align:center;">Нет данных по магазинам за ${escHtml(MONTH_NAMES[currentMonth - 1])}</p>`;
    return;
  }

  // Обновляем print-шапку
  const monthLabel = MONTH_NAMES[currentMonth - 1] + ' 2026';
  document.querySelectorAll('.sprint-ph-month').forEach(el => { el.textContent = monthLabel; });

  // Считаем CF (операционный, без тех. операций)
  const { incoming, outgoing, netCF } = calcKPI(allRows);
  const fmtFull = n => new Intl.NumberFormat('ru-KZ', { maximumFractionDigits: 0 }).format(Math.abs(n)) + ' ₸';

  document.querySelectorAll('.sprint-ph-cf').forEach(el => {
    el.textContent = (netCF >= 0 ? '+' : '−') + fmtFull(netCF);
  });

  // Блок итогов
  const tb = document.getElementById('sprintTotalsBar');
  if (tb) tb.style.display = 'flex';
  const elIn  = document.getElementById('sprintTotalIncoming');
  const elOut = document.getElementById('sprintTotalOutgoing');
  const elNet = document.getElementById('sprintTotalNet');
  if (elIn)  elIn.textContent  = '+' + fmtFull(incoming);
  if (elOut) elOut.textContent = '−' + fmtFull(outgoing);
  if (elNet) elNet.textContent = (netCF >= 0 ? '+' : '−') + fmtFull(netCF);

  // Строим таблицу
  let html = `<table class="sprint-tbl"><thead><tr>`;
  html += `<th>Статья</th><th>Итого</th><th class="sprint-pct">% выр.</th>`;
  stores.forEach(s => { html += `<th>${escHtml(summaryStoreName(s))}</th>`; });
  html += `</tr></thead>`;

  groups.forEach(g => {
    const isIncome  = g.isIncome === true;
    const isExpense = g.isIncome === false;
    const tbodyClass = isIncome ? 'sprint-income-body' : (isExpense ? 'sprint-expense-body' : 'sprint-neutral-body');
    const tbodyStyle = isExpense ? ' style="break-inside:avoid;page-break-inside:avoid"' : '';
    html += `<tbody class="${tbodyClass}"${tbodyStyle}>`;

    // Строка заголовка группы
    const groupRowCls = isIncome ? 'sprint-income' : (isExpense ? 'sprint-expense' : 'sprint-neutral');
    html += `<tr class="${groupRowCls}">`;
    html += `<td>${escHtml(g.name)}</td>`;
    html += `<td>${renderSprintCell(g.subtotalTotal)}</td>`;
    html += `<td>${renderSprintPct(g.subtotalTotal, totalIncome)}</td>`;
    stores.forEach(s => { html += `<td>${renderSprintCell(g.subtotals[s] || 0)}</td>`; });
    html += `</tr>`;

    // Строки статей
    g.articles.forEach(a => {
      html += `<tr class="sprint-article">`;
      html += `<td style="padding-left:18px">${escHtml(a.name)}</td>`;
      html += `<td>${renderSprintCell(a.total)}</td>`;
      html += `<td>${renderSprintPct(a.total, totalIncome)}</td>`;
      if (a.isCompanyWide) {
        html += `<td colspan="${stores.length}" style="text-align:center">${renderSprintCell(a.total)}</td>`;
      } else {
        stores.forEach(s => { html += `<td>${renderSprintCell(a.byStore[s] || 0)}</td>`; });
      }
      html += `</tr>`;
    });

    html += `</tbody>`;
  });

  html += `</table>`;
  wrap.innerHTML = html;
}

function toggleSprintCompact() {
  const checked = document.getElementById('sprintCompactToggle').checked;
  document.body.classList.toggle('sprint-compact', checked);
}
```

- [ ] **Step 3: Проверить синтаксис**

Открыть `dds.html` в браузере, открыть DevTools. Консоль не должна показывать SyntaxError.

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(dds): add renderSummaryPrint, renderSprintCell, toggleSprintCompact"
```

---

### Task 4: JS — подключить вызов рендера и печать

**Files:**
- Modify: `dds.html:2430-2442` (`setSection`) и `dds.html:2509-2513` (`SECTION_PRINT_TITLES`)

- [ ] **Step 1: Добавить вызов в `setSection()`**

В функции `setSection` (строка ~2436) после блока:
```js
  if (name === 'gulzhan' && !document.getElementById('stateContent').classList.contains('hidden')) {
    renderGulzhanMatrix();
  }
```
добавить:
```js
  if (name === 'summary-print' && !document.getElementById('stateContent').classList.contains('hidden')) {
    renderSummaryPrint();
  }
```

- [ ] **Step 2: Добавить в `SECTION_PRINT_TITLES`**

Строка ~2510:
```js
const SECTION_PRINT_TITLES = {
  'section-summary':       'Сводная по статьям',
  'section-summary-print': 'Сводная (печать)',   // ← добавить
  'section-gulzhan':       'Гульжан А.',
  'section-stores':        'Магазины Гульжан А.',
};
```

- [ ] **Step 3: Вызвать `renderSummaryPrint()` при загрузке данных**

Найти место, где вызывается `renderSummaryMatrix()` после загрузки данных (строка ~744 — `renderSummaryMatrix();`). Добавить рядом:
```js
  renderSummaryMatrix();
  renderSummaryPrint();  // ← добавить
```

- [ ] **Step 4: Проверить вручную**

1. Открыть `dds.html`, выбрать месяц «Апрель»
2. Нажать «📄 Сводная (печать)» в сайдбаре
3. Должна отобразиться таблица с белым фоном, рамками, полными числами
4. Блок итогов (Поступления / Расходы / CF) — заполнен
5. Включить чекбокс «Только группы» — подстатьи расходов скрываются, поступления остаются

- [ ] **Step 5: Проверить печать**

Нажать «🖨️ Печать» или Ctrl+P:
- Печатная шапка с заголовком + чип CF появляется
- При прокрутке на следующую страницу заголовок таблицы повторяется
- Цвета ЧБ-читабельны
- `@top-right` содержит «Сводная (печать) · Апрель 2026»

- [ ] **Step 6: Commit**

```bash
git add dds.html
git commit -m "feat(dds): wire renderSummaryPrint into setSection and data load"
```

---

### Task 5: Deploy и финальная проверка

**Files:**
- Modify: `gas/dds.gs` — не меняется
- Push: `dds.html`

- [ ] **Step 1: Проверить все секции не сломались**

Переключиться между всеми секциями: Обзор → Куда ушли → Сводная → **Сводная (печать)** → ДДС Гульжан А. → Магазины. Каждая должна открываться без ошибок в консоли.

- [ ] **Step 2: Проверить Ctrl+P из каждой секции**

Печать из «Сводная (печать)» — работает как описано.  
Печать из «Сводная» — ничего не сломалось (старые print-правила не затронуты).

- [ ] **Step 3: Push на GitHub Pages**

```bash
git push origin main
```

Подождать ~1 мин, проверить https://edigeabdikarim.github.io/daracom-analytics/dds.html

- [ ] **Step 4: Final commit если нужны правки**

При необходимости — правки + коммит с понятным сообщением.

---

## Самопроверка плана

**Spec coverage:**
- ✅ Nav-пункт «📄 Сводная (печать)» — Task 2 Step 1
- ✅ Print-шапка с CF чипом — Task 2 Step 2 (HTML) + Task 3 Step 2 (JS)
- ✅ Блок итогов (поступления/расходы/CF) — Task 2 Step 2 + Task 3 Step 2
- ✅ Чекбокс «Только группы» — Task 2 Step 2 (HTML) + Task 3 Step 2 (`toggleSprintCompact`)
- ✅ Поступления всегда развёрнуты — CSS `sprint-income-body .sprint-article { display: table-row }`
- ✅ `thead display:table-header-group` — Task 3 Step 2 (в JS строка `<table class="sprint-tbl"><thead>`)  + Task 1 Step 2 (CSS)
- ✅ `break-inside:avoid` на `sprint-expense-body` — Task 1 Step 2 (CSS) + Task 3 Step 2 (inline style tbody)
- ✅ `SECTION_PRINT_TITLES` — Task 4 Step 2
- ✅ CF = `calcKPI` операционный — Task 3 Step 2 (явно)
- ✅ Белый фон, чёрные рамки — Task 1 Step 1 CSS

**Нет TBD/TODO:** проверено.

**Типы:** `renderSprintCell` и `renderSprintPct` определены в Task 3 Step 1, используются в Step 2 того же таска. `toggleSprintCompact` привязан к `onchange` в HTML Task 2. Всё консистентно.
