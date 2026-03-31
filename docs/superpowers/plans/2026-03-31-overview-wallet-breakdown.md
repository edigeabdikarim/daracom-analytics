# Overview Wallet Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в раздел «Обзор» (dds.html) разбивку остатков по 12 кошелькам (нал/б/н) под существующими KPI-карточками — с логикой «нач → кон» для прошлых месяцев и «актуально» для текущего.

**Architecture:** GAS-эндпоинт (`dds.gs`) расширяется: `getDDSBalanceSummary()` читает строки кошельков из «ДДС: Сводный» и список месяцев с данными из «ДДС: месяц», возвращает расширенный JSON. На фронте (`dds.html`) добавляются константы маппинга кошельков, функция `renderWallets()` и блок `#walletsBlock` под `#kpiGrid`. Кеш инвалидируется через обновление `BALANCE_VERSION`.

**Tech Stack:** Google Apps Script (V8), Vanilla JS, HTML/CSS

---

### Task 1: Расширить `getDDSBalanceSummary()` в dds.gs

**Files:**
- Modify: `gas/dds.gs:94-121`

- [ ] **Шаг 1: Заменить функцию `getDDSBalanceSummary()`**

Найти в `gas/dds.gs` строки 94–105 (старая функция) и заменить на следующий код:

```javascript
function getDDSBalanceSummary() {
  const ss = SpreadsheetApp.openById(DDS_SHEET_ID);
  const svodny = ss.getSheetByName('ДДС: Сводный');
  if (!svodny) throw new Error('Лист "ДДС: Сводный" не найден');

  const WALLET_KEYS = [
    'ИП Daracom Желтоксан нал',
    'ИП Daracom Above нал',
    'ИП Ахметова нал',
    'ИП Базарханова нал',
    'ИП Нурсоветов нал',
    'ИП Абдыкарим нал',
    'ИП Daracom Above нал Астана',
    'ИП Daracom б/н Мира',
    'ИП Daracom б/н Above',
    'ИП Daracom б/н Above Астана',
    'ИП Ахметова б/н',
    'ИП Базарханова б/н',
    'ИП Нурсоветов б/н',
    'ИП Абдыкарим б/н',
  ];

  const svodnyData = svodny.getDataRange().getValues();
  let balanceRow = null;
  const walletRows = {};

  for (let i = 0; i < svodnyData.length; i++) {
    const label = String(svodnyData[i][0]).trim();
    if (label === 'Денег на начало месяца') {
      balanceRow = svodnyData[i];
    } else if (WALLET_KEYS.includes(label)) {
      walletRows[label] = svodnyData[i];
    }
  }

  if (!balanceRow) throw new Error('Строка "Денег на начало месяца" не найдена');

  // Месяцы, в которых есть хотя бы одна транзакция
  const monthSheet = ss.getSheetByName('ДДС: месяц');
  const monthsWithData = new Set();
  if (monthSheet) {
    const txData = monthSheet.getDataRange().getValues();
    let headerIdx = 2;
    for (let i = 0; i < Math.min(6, txData.length); i++) {
      const c2 = String(txData[i][2]);
      if (c2.includes('цифрой') || c2 === 'Мсц (цифрой)') { headerIdx = i; break; }
      if (String(txData[i][0]) === 'Месяц' && String(txData[i][1]) === 'Год') { headerIdx = i; break; }
    }
    for (let i = headerIdx + 1; i < txData.length; i++) {
      const msc = parseInt(txData[i][2]);
      const amount = parseNumDDS(txData[i][4]);
      if (!isNaN(msc) && msc >= 1 && msc <= 12 &&
          (amount !== 0 || String(txData[i][3]).trim())) {
        monthsWithData.add(msc);
      }
    }
  }

  const result = {
    monthsWithData: Array.from(monthsWithData).sort((a, b) => a - b)
  };

  for (let i = 0; i < 12; i++) {
    const wallets = {};
    WALLET_KEYS.forEach(function(key) {
      wallets[key] = walletRows[key] ? parseNumDDS(walletRows[key][i + 1]) : 0;
    });
    result[i + 1] = {
      balance: parseNumDDS(balanceRow[i + 1]),
      wallets: wallets
    };
  }

  return result;
}
```

- [ ] **Шаг 2: Проверить вручную через Apps Script редактор**

Открыть `gas/dds.gs` в Apps Script, запустить тестовую функцию:

```javascript
function testDDSBalanceSummary() {
  const result = getDDSBalanceSummary();
  Logger.log('monthsWithData: ' + JSON.stringify(result.monthsWithData));
  Logger.log('month 3 balance: ' + result[3].balance);
  Logger.log('month 3 wallets keys: ' + Object.keys(result[3].wallets).length);
  Logger.log('Мира нал март: ' + result[3].wallets['ИП Daracom Желтоксан нал']);
}
```

Ожидаемый вывод в логах:
- `monthsWithData` — массив с месяцами, в которых есть операции (например `[1,2,3,4]`)
- `month 3 balance` — 39765237 (значение из листа)
- `month 3 wallets keys` — 14
- `Мира нал март` — 158123

- [ ] **Шаг 3: Задеплоить обновлённый скрипт**

В Apps Script нажать «Развернуть» → «Управление развёртываниями» → обновить существующее развёртывание.

- [ ] **Шаг 4: Проверить эндпоинт в браузере**

Открыть URL: `<DDS_GAS_URL>?action=dds_balance`

Ожидаемый ответ содержит:
```json
{
  "ok": true,
  "data": {
    "monthsWithData": [1, 2, 3, 4],
    "1": { "balance": 35492540, "wallets": { "ИП Daracom Желтоксан нал": 33100, ... } },
    ...
  }
}
```

- [ ] **Шаг 5: Закоммитить**

```bash
git add gas/dds.gs
git commit -m "feat(gas): add per-wallet balances and monthsWithData to dds_balance endpoint"
```

---

### Task 2: Добавить HTML-контейнер и CSS в dds.html

**Files:**
- Modify: `dds.html:64` (CSS, после `.kpi-val-balance.bal-neg`)
- Modify: `dds.html:394` (HTML, после `<div class="kpi-grid" id="kpiGrid"></div>`)

- [ ] **Шаг 1: Добавить CSS для блока кошельков**

Найти в `dds.html` строку:
```css
    .kpi-val-balance.bal-neg { color: #EF4444; }
```

Добавить сразу после неё (новой строкой):

```css
    /* Wallet breakdown block */
    .wr-block { background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .wr-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .wr-title { font-size: 14px; font-weight: 700; color: #111827; }
    .wr-badge { font-size: 11px; font-weight: 600; color: #10B981; background: #D1FAE5; padding: 2px 8px; border-radius: 20px; }
    .wr-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .wr-col-title { font-size: 12px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #F3F4F6; }
    .wr-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #F9FAFB; }
    .wr-row:last-child { border-bottom: none; }
    .wr-label { color: #374151; font-weight: 500; }
    .wr-val { font-family: 'JetBrains Mono', 'Courier New', monospace; font-weight: 600; color: #111827; font-size: 13px; }
    .wr-pair { display: flex; align-items: center; gap: 6px; }
    .wr-start { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #6B7280; }
    .wr-arrow { color: #9CA3AF; font-size: 12px; }
    .wr-end { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; font-weight: 600; color: #111827; }
    .wr-total { border-top: 2px solid #E5E7EB !important; border-bottom: none !important; margin-top: 4px; padding-top: 8px !important; }
    .wr-total .wr-label { font-weight: 700; color: #111827; }
    .wr-total .wr-val { font-size: 14px; color: #8B5CF6; }
    @media (max-width: 640px) { .wr-cols { grid-template-columns: 1fr; } }
```

- [ ] **Шаг 2: Добавить HTML-контейнер блока кошельков**

Найти в `dds.html` строку:
```html
        <div class="kpi-grid" id="kpiGrid"></div>
```

Добавить сразу после неё:
```html
        <div id="walletsBlock" class="wr-block" style="display:none;"></div>
```

- [ ] **Шаг 3: Закоммитить**

```bash
git add dds.html
git commit -m "feat(ui): add wallet breakdown container and CSS to Overview section"
```

---

### Task 3: Добавить константы и функцию `renderWallets()`

**Files:**
- Modify: `dds.html` — добавить константы перед `function renderKPI()` (строка ~708), добавить функции после `renderKPI()` (строка ~758)

- [ ] **Шаг 1: Добавить константы кошельков**

Найти в `dds.html` строку:
```javascript
function renderKPI() {
```

Добавить перед ней:

```javascript
// ─── WALLET CONSTANTS ─────────────────────────────────
const CASH_WALLETS = [
  { key: 'ИП Daracom Желтоксан нал',   label: 'Мира'          },
  { key: 'ИП Daracom Above нал',        label: 'Above Алмата'  },
  { key: 'ИП Ахметова нал',             label: 'Есентай'       },
  { key: 'ИП Базарханова нал',          label: 'Абайка'        },
  { key: 'ИП Нурсоветов нал',           label: 'Восход'        },
  { key: 'ИП Абдыкарим нал',            label: 'Астана'        },
  { key: 'ИП Daracom Above нал Астана', label: 'Above Астана'  },
];
const NONCASH_WALLETS = [
  { keys: ['ИП Daracom б/н Мира', 'ИП Daracom б/н Above', 'ИП Daracom б/н Above Астана'], label: 'ИП Daracom' },
  { key: 'ИП Ахметова б/н',    label: 'Есентай' },
  { key: 'ИП Базарханова б/н', label: 'Абайка'  },
  { key: 'ИП Нурсоветов б/н',  label: 'Восход'  },
  { key: 'ИП Абдыкарим б/н',   label: 'Астана'  },
];

```

- [ ] **Шаг 2: Добавить вспомогательную функцию и `renderWallets()`**

Найти в `dds.html` строку (конец `renderKPI`):
```javascript
  `;
}

// ─── TOP-5 CHART ──────────────────────────────────────
```

Добавить между `}` и `// ─── TOP-5 CHART` следующий код:

```javascript
// ─── WALLET BREAKDOWN ─────────────────────────────────
function getWalletVal(entry, month) {
  const m = monthlyBalance && monthlyBalance[month];
  if (!m || !m.wallets) return 0;
  if (entry.keys) return entry.keys.reduce(function(s, k) { return s + (m.wallets[k] || 0); }, 0);
  return m.wallets[entry.key] || 0;
}

function renderWallets() {
  const el = document.getElementById('walletsBlock');
  if (!el) return;

  if (!monthlyBalance || !monthlyBalance[currentMonth] || !monthlyBalance[currentMonth].wallets) {
    el.style.display = 'none';
    return;
  }

  const monthsWithData = monthlyBalance.monthsWithData || [];
  const isCurrentMonth = monthsWithData.length === 0 || !monthsWithData.includes(currentMonth + 1);

  function walletRow(entry) {
    const valStart = getWalletVal(entry, currentMonth);
    if (isCurrentMonth) {
      return '<div class="wr-row">' +
        '<span class="wr-label">' + entry.label + '</span>' +
        '<span class="wr-val">' + fmt(valStart) + '</span>' +
        '</div>';
    }
    const valEnd = getWalletVal(entry, currentMonth + 1);
    return '<div class="wr-row">' +
      '<span class="wr-label">' + entry.label + '</span>' +
      '<span class="wr-pair">' +
        '<span class="wr-start">' + fmt(valStart) + '</span>' +
        '<span class="wr-arrow">→</span>' +
        '<span class="wr-end">' + fmt(valEnd) + '</span>' +
      '</span>' +
      '</div>';
  }

  const cashTotal = CASH_WALLETS.reduce(function(s, e) { return s + getWalletVal(e, currentMonth); }, 0);
  const noncashTotal = NONCASH_WALLETS.reduce(function(s, e) { return s + getWalletVal(e, currentMonth); }, 0);

  el.style.display = '';
  el.innerHTML =
    '<div class="wr-header">' +
      '<span class="wr-title">Остатки по кошелькам</span>' +
      (isCurrentMonth ? '<span class="wr-badge">● Актуально</span>' : '') +
    '</div>' +
    '<div class="wr-cols">' +
      '<div class="wr-col">' +
        '<div class="wr-col-title">💵 Наличные</div>' +
        CASH_WALLETS.map(walletRow).join('') +
        '<div class="wr-row wr-total">' +
          '<span class="wr-label">Итого</span>' +
          '<span class="wr-val">' + fmt(cashTotal) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="wr-col">' +
        '<div class="wr-col-title">🏦 Безналичные</div>' +
        NONCASH_WALLETS.map(walletRow).join('') +
        '<div class="wr-row wr-total">' +
          '<span class="wr-label">Итого</span>' +
          '<span class="wr-val">' + fmt(noncashTotal) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
}

```

- [ ] **Шаг 3: Закоммитить**

```bash
git add dds.html
git commit -m "feat(js): add wallet constants and renderWallets() function"
```

---

### Task 4: Подключить `renderWallets()`, инвалидировать кеш

**Files:**
- Modify: `dds.html:547` — обновить `BALANCE_VERSION`
- Modify: `dds.html:568` — добавить вызов `renderWallets()` после загрузки баланса
- Modify: `dds.html:679` — добавить вызов в `renderAll()`

- [ ] **Шаг 1: Обновить версию кеша**

Найти в `dds.html`:
```javascript
  const BALANCE_VERSION = 'v3-direct-from-svodny';
```
Заменить на:
```javascript
  const BALANCE_VERSION = 'v4-with-wallets';
```

- [ ] **Шаг 2: Добавить `renderWallets()` в fetch-коллбэк**

Найти в `dds.html`:
```javascript
      if (document.getElementById('stateContent').style.display !== 'none' &&
          !document.getElementById('stateContent').classList.contains('hidden')) {
        renderKPI();
      }
```
Заменить на:
```javascript
      if (document.getElementById('stateContent').style.display !== 'none' &&
          !document.getElementById('stateContent').classList.contains('hidden')) {
        renderKPI();
        renderWallets();
      }
```

- [ ] **Шаг 3: Добавить `renderWallets()` в `renderAll()`**

Найти в `dds.html`:
```javascript
function renderAll() {
  renderKPI();
  renderExpensesSection();
```
Заменить на:
```javascript
function renderAll() {
  renderKPI();
  renderWallets();
  renderExpensesSection();
```

- [ ] **Шаг 4: Проверить в браузере — прошедший месяц**

1. Открыть `dds.html` (локально или задеплоенный)
2. Выбрать месяц **январь** (месяц 1)
3. Убедиться:
   - Блок «Остатки по кошелькам» появился под KPI-карточками
   - **Нет** бейджа «● Актуально»
   - Каждая строка показывает `нач → кон`, например: `Мира  33 100 → 63 040`
   - Итого нал = сумма 7 строк; итого б/н = сумма 5 строк

- [ ] **Шаг 5: Проверить в браузере — текущий месяц**

1. Выбрать **последний месяц с данными** (например, март или апрель 2026)
2. Убедиться:
   - Бейдж «● Актуально» отображается
   - Каждая строка показывает одну цифру (без стрелки)
   - Значения совпадают с данными в таблице «ДДС: Сводный»

- [ ] **Шаг 6: Проверить инвалидацию кеша**

1. Открыть DevTools → Application → LocalStorage
2. Убедиться что запись `dds_balance_cache` содержит `"ver":"v4-with-wallets"` и поле `wallets` в данных месяца

- [ ] **Шаг 7: Финальный коммит**

```bash
git add dds.html
git commit -m "feat(overview): wire renderWallets into renderAll, update cache version to v4-with-wallets"
```
