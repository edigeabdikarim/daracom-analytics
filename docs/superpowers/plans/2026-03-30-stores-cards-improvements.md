# Улучшения карточек «По магазинам» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Устранить двойной учёт возвратов в торговых карточках, добавить офисные карточки Компания/Офис с разбивкой поступлений и расходов, заменить div-строки групп на таблицу, улучшить качество печати.

**Architecture:** Все изменения — только в `dds.html`. Вводим `OFFICE_STORES` для разветвления логики агрегации и рендера внутри `renderStoreGrid()`. Print header для «По магазинам» по аналогии с `#summaryPrintHeader`.

**Tech Stack:** Vanilla JS, HTML, CSS; один файл `dds.html`. Тестирование — ручная проверка в браузере.

---

## Files

- Modify: `dds.html`
  - `renderStoreGrid()` — строки ~841–917 (агрегация + рендер)
  - HTML секция «По магазинам» — строка ~424 (добавить `#storesPrintHeader`)
  - `@media print` — строки ~208–235 (добавить правила для stores)

---

## Task 1: Агрегация — OFFICE_STORES + displayOut + incGroups

**Files:**
- Modify: `dds.html` строки 841–860 (тело агрегации в `renderStoreGrid`)

- [ ] **Шаг 1: Заменить блок агрегации в `renderStoreGrid`**

Найти в `dds.html` строку:
```javascript
function renderStoreGrid() {
  const EXCLUDED_STORE_GROUPS = new Set(['Платежи', 'Основные средства', 'Финансирование', 'Продажи']);
  const storeMap = {};
  filteredRows.forEach(r => {
    if (r.activity === 'Техническая операция' || !r.store) return;
    if (!storeMap[r.store]) storeMap[r.store] = { inc: 0, out: 0, salesInc: 0, salesOut: 0, groups: {} };
    const grp = ARTICLE_GROUP[r.article] || 'Прочее';
    if (r.type === 'Поступление') {
      storeMap[r.store].inc += r.amount;
      if (grp === 'Продажи') storeMap[r.store].salesInc += r.amount;
    }
    if (r.type === 'Выбытие') {
      const amt = Math.abs(r.amount);
      storeMap[r.store].out += amt;
      if (grp === 'Продажи') storeMap[r.store].salesOut += amt;
      if (!EXCLUDED_STORE_GROUPS.has(grp)) {
        storeMap[r.store].groups[grp] = (storeMap[r.store].groups[grp] || 0) + amt;
      }
    }
  });
```

Заменить на:
```javascript
function renderStoreGrid() {
  const OFFICE_STORES = new Set(['Компания', 'Офис']);
  const EXCLUDED_STORE_GROUPS = new Set(['Платежи', 'Основные средства', 'Финансирование', 'Продажи']);
  const storeMap = {};
  filteredRows.forEach(r => {
    if (r.activity === 'Техническая операция' || !r.store) return;
    const isOffice = OFFICE_STORES.has(r.store);
    if (!storeMap[r.store]) storeMap[r.store] = { inc: 0, out: 0, salesInc: 0, salesOut: 0, groups: {}, incGroups: {} };
    const grp = ARTICLE_GROUP[r.article] || 'Прочее';
    if (r.type === 'Поступление') {
      storeMap[r.store].inc += r.amount;
      if (grp === 'Продажи') {
        storeMap[r.store].salesInc += r.amount;
      } else if (isOffice) {
        storeMap[r.store].incGroups[grp] = (storeMap[r.store].incGroups[grp] || 0) + r.amount;
      }
    }
    if (r.type === 'Выбытие') {
      const amt = Math.abs(r.amount);
      storeMap[r.store].out += amt;
      if (grp === 'Продажи') storeMap[r.store].salesOut += amt;
      // Breakdown: для офисных без фильтра групп, для торговых — с EXCLUDED_STORE_GROUPS
      if (isOffice || !EXCLUDED_STORE_GROUPS.has(grp)) {
        storeMap[r.store].groups[grp] = (storeMap[r.store].groups[grp] || 0) + amt;
      }
    }
  });
```

**Пояснение изменений:**
- Добавлен `OFFICE_STORES` для разветвления логики
- `incGroups` — новое поле, накапливает поступления офисных карточек по группам (кроме «Продажи»)
- `d.out` по-прежнему включает все выбытия (для корректного CF); `displayOut = d.out - d.salesOut` будет вычислен в рендере для торговых карточек
- Для офисных карточек EXCLUDED_STORE_GROUPS не применяется → все группы расходов попадают в breakdown

- [ ] **Шаг 2: Проверить в браузере**

Открыть `dds.html` локально → раздел «По магазинам». Убедиться, что карточки магазинов отображаются без ошибок в консоли.

- [ ] **Шаг 3: Commit**

```bash
git add dds.html
git commit -m "feat(dds/stores): add OFFICE_STORES split, incGroups field in aggregation"
```

---

## Task 2: Рендер — таблица групп + карточки торговые и офисные

**Files:**
- Modify: `dds.html` строки ~866–916 (блок `grid.innerHTML = stores.map(...)`)

- [ ] **Шаг 1: Заменить весь блок рендера карточек**

Найти в `dds.html` строку:
```javascript
  grid.innerHTML = stores.map(([name, d]) => {
    const salesTotal = d.salesInc - d.salesOut;
    const cf = d.inc - d.out;
```

И заменить блок от `grid.innerHTML = stores.map(([name, d]) => {` до конца `}).join('');` (строки ~866–916) на:

```javascript
  grid.innerHTML = stores.map(([name, d]) => {
    const isOffice = OFFICE_STORES.has(name);
    const salesTotal = d.salesInc - d.salesOut;
    // Для торговых: исключаем Возвраты товаров (salesOut) из отображаемых Выбытий
    const displayOut = isOffice ? d.out : d.out - d.salesOut;
    const cf = d.inc - d.out;
    const cfColor = cf >= 0 ? '#10B981' : '#EF4444';

    // % затрат (displayOut / salesTotal) — только для торговых
    const pct = salesTotal > 0 ? displayOut / salesTotal * 100 : 0;
    const pctColor = pct < 80 ? '#059669' : pct < 100 ? '#D97706' : '#DC2626';
    const pctBg   = pct < 80 ? '#D1FAE5' : pct < 100 ? '#FEF3C7' : '#FEE2E2';
    const barFill = Math.min(pct, 100).toFixed(1);

    const groups    = Object.entries(d.groups).sort((a, b) => b[1] - a[1]);
    const incGroups = Object.entries(d.incGroups).sort((a, b) => b[1] - a[1]);

    // Таблица расходных групп: для торговых — с %, для офисных — без %
    const groupRows = groups.map(([grpName, amt]) => {
      const gp = salesTotal > 0 ? (amt / salesTotal * 100).toFixed(0) : '0';
      return isOffice
        ? `<tr>
            <td style="padding:3px 6px;color:#374151;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(grpName)}</td>
            <td style="padding:3px 6px;color:#EF4444;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
          </tr>`
        : `<tr>
            <td style="padding:3px 6px;color:#374151;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(grpName)}</td>
            <td style="padding:3px 6px;color:#EF4444;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
            <td style="padding:3px 6px;color:#6B7280;font-weight:700;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${gp}%</td>
          </tr>`;
    }).join('');

    // Таблица поступлений по группам (только офисные, без %)
    const incGroupRows = incGroups.map(([grpName, amt]) =>
      `<tr>
        <td style="padding:3px 6px;color:#374151;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(grpName)}</td>
        <td style="padding:3px 6px;color:#10B981;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
      </tr>`
    ).join('');

    if (isOffice) {
      // ── Офисная карточка ──────────────────────────────────
      return `<div class="store-card" data-store="${escHtml(name)}" onclick="openDrillStore(this.dataset.store)">
        <div class="store-name">${escHtml(shortStoreName(name))}</div>
        <div class="store-row"><span class="store-row-label">Выбытия</span><span class="store-row-val" style="color:#EF4444">${fmt(d.out)}</span></div>
        <div class="store-row" style="margin-top:8px;padding-top:8px;border-top:1px solid #F3F4F6">
          <span class="store-row-label font-semibold">Чистый CF</span>
          <span class="store-row-val" style="color:${cfColor}">${cf >= 0 ? '+' : ''}${fmt(cf)}</span>
        </div>
        ${incGroups.length ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Поступления по группам</div>
          <table style="width:100%;border-collapse:collapse;">${incGroupRows}</table>
        </div>
        ` : ''}
        ${groups.length ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Выбытия по группам</div>
          <table style="width:100%;border-collapse:collapse;">${groupRows}</table>
        </div>
        ` : ''}
      </div>`;
    }

    // ── Торговая карточка ─────────────────────────────────
    return `<div class="store-card" data-store="${escHtml(name)}" onclick="openDrillStore(this.dataset.store)">
      <div class="store-name">${escHtml(shortStoreName(name))}</div>
      <div class="store-row"><span class="store-row-label">Продажи</span><span class="store-row-val" style="color:#10B981">${fmt(salesTotal)}</span></div>
      <div class="store-row"><span class="store-row-label">Выбытия</span><span class="store-row-val" style="color:#EF4444">${fmt(displayOut)}</span></div>
      <div class="store-row" style="margin-top:8px;padding-top:8px;border-top:1px solid #F3F4F6">
        <span class="store-row-label font-semibold">Чистый CF</span>
        <span class="store-row-val" style="color:${cfColor}">${cf >= 0 ? '+' : ''}${fmt(cf)}</span>
      </div>
      ${salesTotal > 0 ? `
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <span style="font-size:11px;color:#6B7280;">Затраты от продаж</span>
          <span style="font-size:12px;font-weight:700;color:${pctColor};background:${pctBg};padding:1px 7px;border-radius:4px;">${pct.toFixed(0)}%</span>
        </div>
        <div style="height:4px;background:#F3F4F6;border-radius:2px;margin-bottom:10px;">
          <div style="height:4px;border-radius:2px;background:${pctColor};width:${barFill}%;"></div>
        </div>
        ${groups.length ? `
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Выбытия по группам</div>
          <table style="width:100%;border-collapse:collapse;">${groupRows}</table>
        ` : ''}
      </div>
      ` : ''}
    </div>`;
  }).join('');
}
```

- [ ] **Шаг 2: Проверить в браузере**

Открыть `dds.html` → раздел «По магазинам». Проверить:
- Торговые карточки (Астана, Мира и др.): показывают «Продажи» (net), «Выбытия» (без возвратов), таблицу групп с %.
- «Офис» (если есть данные): показывает только «Выбытия», «Чистый CF», таблицы поступлений/расходов без %.
- «Компания» (если есть данные): аналогично «Офис».
- Нет ошибок в DevTools консоли.

- [ ] **Шаг 3: Commit**

```bash
git add dds.html
git commit -m "feat(dds/stores): table for group breakdown, office card layout (Компания/Офис)"
```

---

## Task 3: Улучшения печати

**Files:**
- Modify: `dds.html`
  - HTML строка ~424 (добавить `#storesPrintHeader`)
  - JS в `renderStoreGrid()` конец функции (заполнить print header)
  - CSS `@media print` строки ~208–235 (добавить правила)

- [ ] **Шаг 1: Добавить HTML блок `#storesPrintHeader`**

Найти в `dds.html`:
```html
        <div class="store-grid" id="storeGrid"></div>
```

Заменить на:
```html
        <div id="storesPrintHeader" style="display:none;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #1E3A5F;">
          <div style="font-size:16px;font-weight:700;color:#1E3A5F;margin-bottom:8px;">ДДС · Daracom — По магазинам</div>
          <div style="display:flex;gap:32px;">
            <div>
              <div style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Остаток на начало месяца</div>
              <div style="font-size:13px;font-weight:700;color:#1E3A5F;" id="sprintBalOpen">—</div>
            </div>
            <div>
              <div style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;">Остаток на конец месяца</div>
              <div style="font-size:13px;font-weight:700;color:#1E3A5F;" id="sprintBalClose">—</div>
            </div>
          </div>
        </div>
        <div class="store-grid" id="storeGrid"></div>
```

- [ ] **Шаг 2: Заполнять print header в `renderStoreGrid()`**

В конце функции `renderStoreGrid()`, после строки `grid.innerHTML = stores.map(...).join('');`, добавить:

```javascript
  // Заполняем блок остатков для печати
  const sprintBal = monthlyBalance ? calcBalance(currentMonth) : null;
  const sprintOpen  = document.getElementById('sprintBalOpen');
  const sprintClose = document.getElementById('sprintBalClose');
  if (sprintOpen && sprintBal)  sprintOpen.textContent  = fmt(sprintBal.balanceStart) + ' ₸';
  if (sprintClose && sprintBal) sprintClose.textContent = fmt(sprintBal.balanceEnd)   + ' ₸';
```

- [ ] **Шаг 3: Добавить CSS правила в `@media print`**

Найти в `@media print` строку:
```css
      .sma-last td { border-bottom-color: #1E3A5F !important; }
    }
```

Заменить на:
```css
      .sma-last td { border-bottom-color: #1E3A5F !important; }
      /* По магазинам — печать */
      #storesPrintHeader { display: block !important; }
      #storeGrid .store-card { page-break-inside: avoid; break-inside: avoid; color: #111 !important; }
      #storeGrid .store-card td,
      #storeGrid .store-card span,
      #storeGrid .store-card div { color: inherit; }
      #storeGrid .store-name { color: #111 !important; }
      #storeGrid { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
```

- [ ] **Шаг 4: Проверить печать**

В браузере → раздел «По магазинам» → Ctrl+P (предпросмотр печати). Проверить:
- Виден блок с остатками на начало и конец месяца вверху страницы.
- Карточки не обрезаются между страницами.
- Текст в карточках достаточно контрастный (тёмный).
- Разделительные линии таблицы групп видны.

- [ ] **Шаг 5: Commit**

```bash
git add dds.html
git commit -m "feat(dds/stores): print improvements — balance header, page-break, contrast text"
```

---

## Self-Review

**Spec coverage:**
- ✅ Возвраты товаров исключены из Выбытий торговых карточек (Task 1 + Task 2: `displayOut = d.out - d.salesOut`)
- ✅ Компания добавлена в грид (автоматически через storeMap — нет явного исключения в `renderStoreGrid`, строка 1183 в `renderSummaryMatrix` не трогается)
- ✅ Компания и Офис — поступления по группам (Task 1: `incGroups`, Task 2: `incGroupRows`)
- ✅ Компания и Офис — расходы без EXCLUDED_STORE_GROUPS (Task 1: `isOffice || !EXCLUDED_STORE_GROUPS.has(grp)`)
- ✅ Таблица вместо div для breakdown групп (Task 2: `<table>` с `border-collapse:collapse`)
- ✅ % в группах только для торговых карточек (Task 2: ternary в `groupRows`)
- ✅ Контрастный шрифт при печати (Task 3: `color: #111 !important`)
- ✅ Остатки на начало/конец при печати (Task 3: `#storesPrintHeader`)
- ✅ Карточки не обрезаются при печати (Task 3: `page-break-inside: avoid`)

**Примечание по «Компания»:** В `renderStoreGrid` нет явного фильтра для «Компания». Если в реальных данных строки с `r.store = 'Компания'` существуют, карточка появится автоматически. Если данных нет — карточки просто не будет. Исключение `s !== 'Компания'` в строке ~1183 относится к `renderSummaryMatrix` и не трогается.
