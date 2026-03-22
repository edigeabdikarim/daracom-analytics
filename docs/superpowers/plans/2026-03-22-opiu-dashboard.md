# ОПиУ Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать страницу `opiu.html` — П&У дашборд с таблицей по магазинам, переключателем месяца и % от выручки, с данными через GAS.

**Architecture:** Новый GAS endpoint `?action=opiu&month=N` в `dashboard.gs` читает лист N ОПиУ-таблицы и возвращает строки П&У с данными по магазинам. Страница `opiu.html` (vanilla JS, Tailwind, light theme) фетчит этот endpoint и рендерит таблицу. Кэш в localStorage на 30 мин.

**Tech Stack:** Google Apps Script (GAS), vanilla JS, Tailwind CSS CDN, Manrope font, localStorage cache, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-03-22-opiu-dashboard-design.md`

---

## File Map

| Файл | Действие | Ответственность |
|------|----------|-----------------|
| `gas/dashboard.gs` | Modify | Добавить `?action=opiu` роутинг + функцию `getOPiUTableData(month)` |
| `opiu.html` | Create | Весь П&У дашборд: HTML, CSS, JS |
| `dashboard.html` | Modify | Добавить кнопку `ОПиУ →` в header |
| `dds.html` | Modify | Добавить кнопку `ОПиУ →` в header |

---

## Task 1: GAS endpoint `?action=opiu&month=N`

**Files:**
- Modify: `gas/dashboard.gs`

### Константы для ОПиУ-таблицы

В `dashboard.gs` уже есть `OPIU_ID`, `STORE_NAMES` (8 магазинов), `STORE_COLS = [2..9]`. Для нового endpoint нужны расширенные константы с Online.

- [ ] **Шаг 1: Добавить константы OPIU_ALL_STORE_NAMES и OPIU_ALL_COLS**

Добавить сразу после блока `const TOTAL_COL = 12;` (строка ~21 в `dashboard.gs`):

```javascript
// Константы для opiu endpoint (включают Online Продажи)
const OPIU_ALL_STORE_NAMES = [
  'Магазин Астана', 'Магазин Above Астана', 'Магазин Мира',
  'Магазин Есентай', 'Магазин Абайка', 'Магазин Above',
  'Магазин Восход', 'Магазин Kaspi', 'Online Продажи'
];
const OPIU_ALL_COLS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

const OPIU_GROUP_LABELS = [
  'Выручка',
  'Переменные',
  'Маржинальный доход',
  'Прямые постоянные',
  'Валовая прибыль по направлениям'
];
```

- [ ] **Шаг 2: Добавить роутинг в `doGet`**

В функции `doGet`, перед `try {` (строка ~34), добавить:

```javascript
  if (e && e.parameter && e.parameter.action === 'opiu') {
    return doGetOPiU(e);
  }
```

- [ ] **Шаг 3: Написать функцию `doGetOPiU`**

Добавить в конец файла (после `buildDynamics`):

```javascript
// ═══════════════════ ОПиУ TABLE ENDPOINT ═════════════
function doGetOPiU(e) {
  try {
    const month = parseInt((e && e.parameter && e.parameter.month) || (new Date().getMonth() + 1));
    if (isNaN(month) || month < 1 || month > 12) throw new Error('Некорректный номер месяца');
    const data = getOPiUTableData(month);
    return buildResponse(JSON.stringify({ ok: true, data: data }));
  } catch (err) {
    return buildResponse(JSON.stringify({ ok: false, error: err.message }));
  }
}

function getOPiUTableData(month) {
  // OPIU_ID — существующая константа в dashboard.gs (строка ~11)
  var ss = SpreadsheetApp.openById(OPIU_ID);
  var sheet = ss.getSheetByName(String(month));
  if (!sheet) throw new Error('Лист ' + month + ' не найден в ОПиУ');

  var raw = sheet.getRange('A1:M200').getValues();
  var rows = [];
  var currentParent = null;

  // Пропускаем row 0 (заголовок)
  for (var i = 1; i < raw.length; i++) {
    var label = String(raw[i][1]).trim();
    if (!label) continue;

    var isGroup = OPIU_GROUP_LABELS.indexOf(label) !== -1;

    // Собираем значения по всем магазинам + Итого
    var values = {};
    var hasNonZero = false;
    for (var j = 0; j < OPIU_ALL_STORE_NAMES.length; j++) {
      var v = parseNum(raw[i][OPIU_ALL_COLS[j]]);
      values[OPIU_ALL_STORE_NAMES[j]] = v;
      if (v !== 0) hasNonZero = true;
    }
    var totalVal = parseNum(raw[i][TOTAL_COL]);
    values['Итого'] = totalVal;
    if (totalVal !== 0) hasNonZero = true;

    if (isGroup) {
      // Групповые строки ВСЕГДА добавляем, даже если все значения = 0
      currentParent = label;
      rows.push({ label: label, type: 'group', parent: null, values: values });
    } else if (hasNonZero) {
      // Подстатьи пропускаем только если все нули
      rows.push({ label: label, type: 'item', parent: currentParent, values: values });
    }
    // Иначе — пропускаем строку (пустые разделители)
  }

  if (rows.length === 0) throw new Error('Нет данных в листе ' + month);

  return {
    month: month,
    stores: OPIU_ALL_STORE_NAMES,
    rows: rows
  };
}
```

- [ ] **Шаг 4: Проверить синтаксис — открыть `gas/dashboard.gs` глазами и убедиться что нет лишних скобок**

- [ ] **Шаг 5: Задеплоить GAS**

```bash
cd "C:\Users\Asus\Desktop\ClaudeSheets\gas"
clasp push --force
clasp deploy --deploymentId AKfycbyukzkRocAiDyYN2CVQcuVi2FXDUOOjL4qofWMnoK3PaiEpaqF3ojpE2u0JsKEYFwYprA --description "feat: add opiu endpoint"
```

Ожидаем: `Updated deployment [AKfycby...]`

- [ ] **Шаг 6: Проверить endpoint вручную**

Открыть в браузере:
```
https://script.google.com/macros/s/AKfycbyukzkRocAiDyYN2CVQcuVi2FXDUOOjL4qofWMnoK3PaiEpaqF3ojpE2u0JsKEYFwYprA/exec?action=opiu&month=3
```

Ожидаем JSON вида `{ "ok": true, "data": { "month": 3, "stores": [...], "rows": [...] } }` с непустым массивом rows, первый row — `{ "label": "Выручка", "type": "group", ... }`.

- [ ] **Шаг 7: Коммит GAS изменений**

```bash
cd "C:\Users\Asus\Desktop\ClaudeSheets"
git add gas/dashboard.gs
git commit -m "feat: add ?action=opiu endpoint to dashboard.gs"
```

---

## Task 2: `opiu.html` — каркас, стили, состояния

**Files:**
- Create: `opiu.html`

- [ ] **Шаг 1: Создать `opiu.html` с базовым каркасом**

Создать файл `C:\Users\Asus\Desktop\ClaudeSheets\opiu.html`:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ОПиУ · Daracom</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            pageBg: '#F8F9FC',
            surface: '#FFFFFF',
            border: '#E5E7EB',
            textMain: '#111827',
            textMuted: '#6B7280',
            accent: '#10B981',
          },
          fontFamily: { sans: ['Manrope', 'sans-serif'] }
        }
      }
    }
  </script>
  <style>
    * { box-sizing: border-box; }
    body { background: #F8F9FC; color: #111827; font-family: 'Manrope', sans-serif; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #F1F5F9; }
    ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }

    .loader { border: 3px solid #E5E7EB; border-top-color: #10B981; border-radius: 50%; width: 36px; height: 36px; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── P&L Table ── */
    .pl-wrap { overflow-x: auto; background: #fff; border: 1px solid #E5E7EB; border-radius: 12px; }
    .pl-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 900px; }
    .pl-table th {
      padding: 10px 14px; text-align: right; font-size: 11px; font-weight: 700;
      color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em;
      border-bottom: 2px solid #E5E7EB; background: #F9FAFB;
      white-space: nowrap; position: sticky; top: 0; z-index: 2;
    }
    .pl-table th:first-child { text-align: left; position: sticky; left: 0; z-index: 3; background: #F9FAFB; min-width: 200px; }
    .pl-table td { padding: 8px 14px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
    .pl-table td:first-child {
      text-align: left; position: sticky; left: 0; background: #fff; z-index: 1;
      font-weight: 500; white-space: nowrap;
    }
    .pl-table td:not(:first-child) { text-align: right; white-space: nowrap; }

    /* Group rows */
    .pl-row-group td { font-weight: 700; font-size: 13px; border-top: 2px solid #E5E7EB; }
    .pl-row-group td:first-child { font-weight: 700; }
    .bg-income td { background: rgba(16,185,129,0.08); }
    .bg-income td:first-child { background: rgba(16,185,129,0.08); }
    .bg-expense td { background: rgba(239,68,68,0.08); }
    .bg-expense td:first-child { background: rgba(239,68,68,0.08); }

    /* Item rows */
    .pl-row-item td:first-child { padding-left: 28px; font-size: 12px; font-weight: 400; color: #374151; }
    .pl-row-item td:not(:first-child) { font-size: 12px; }

    /* Value cell */
    .cell-val { font-weight: 600; }
    .cell-pct { font-size: 11px; color: #9CA3AF; margin-top: 1px; }
    .cell-dash { color: #D1D5DB; }
  </style>
</head>
<body class="min-h-screen">

  <!-- ═══ КОНФИГУРАЦИЯ ═══ -->
  <script>
    const CONFIG = {
      GAS_URL: 'https://script.google.com/macros/s/AKfycbyukzkRocAiDyYN2CVQcuVi2FXDUOOjL4qofWMnoK3PaiEpaqF3ojpE2u0JsKEYFwYprA/exec',
      CACHE_TTL_MS: 30 * 60 * 1000,
    };
    const MONTH_NAMES = ['','Январь','Февраль','Март','Апрель','Май','Июнь',
                          'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    // Цвет фона группового ряда (статичный, по метке)
    const GROUP_BG = {
      'Выручка': 'bg-income',
      'Переменные': 'bg-expense',
      'Маржинальный доход': 'bg-income',
      'Прямые постоянные': 'bg-expense',
      'Валовая прибыль по направлениям': 'bg-income',
    };
  </script>

  <!-- ═══ HEADER ═══ -->
  <header class="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-2">
      <span class="font-bold text-gray-900 text-base">ОПиУ · Daracom</span>
      <span class="text-gray-300 mx-1">·</span>
      <span class="text-sm text-gray-500" id="headerSub">Загрузка…</span>
    </div>
    <div class="flex items-center gap-2">
      <a href="dashboard.html" class="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">← Финотчёт</a>
      <a href="dds.html" class="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">ДДС →</a>
      <button onclick="refreshData()" class="text-sm font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:border-green-500 hover:text-green-600 text-gray-600 transition-colors">↻ Обновить</button>
      <select id="monthSel" onchange="onMonthChange()" class="border border-gray-200 text-sm rounded-lg px-3 py-1.5 bg-white text-gray-800 outline-none focus:ring-1 focus:ring-green-500 font-medium cursor-pointer">
        <option value="1">Январь</option><option value="2">Февраль</option>
        <option value="3">Март</option><option value="4">Апрель</option>
        <option value="5">Май</option><option value="6">Июнь</option>
        <option value="7">Июль</option><option value="8">Август</option>
        <option value="9">Сентябрь</option><option value="10">Октябрь</option>
        <option value="11">Ноябрь</option><option value="12">Декабрь</option>
      </select>
    </div>
  </header>

  <!-- ═══ STATES ═══ -->
  <div id="stateLoading" class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div class="loader"></div>
    <p class="text-gray-400 text-sm font-medium">Загрузка данных ОПиУ…</p>
  </div>

  <div id="stateError" class="hidden flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
    <div class="text-4xl">⚠️</div>
    <p class="text-gray-700 font-semibold" id="errorMsg">Ошибка загрузки</p>
    <button onclick="loadData()" class="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700">Повторить</button>
  </div>

  <div id="stateEmpty" class="hidden flex-col items-center justify-center min-h-[60vh] gap-4">
    <div class="text-4xl">📭</div>
    <p class="text-gray-500 font-medium">Нет данных за выбранный месяц</p>
  </div>

  <!-- ═══ CONTENT ═══ -->
  <main id="stateContent" class="hidden px-6 py-6 max-w-screen-2xl mx-auto">
    <div class="pl-wrap">
      <table class="pl-table" id="plTable">
        <thead id="plHead"></thead>
        <tbody id="plBody"></tbody>
      </table>
    </div>
  </main>

  <script>
  // ─── STATE ─────────────────────────────────────
  let currentMonth = new Date().getMonth() + 1;
  let currentData = null;

  // ─── INIT ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('monthSel');
    sel.value = currentMonth;
    loadData();
  });

  function onMonthChange() {
    currentMonth = parseInt(document.getElementById('monthSel').value);
    loadData();
  }

  function refreshData() {
    localStorage.removeItem(cacheKey(currentMonth));
    loadData(true);
  }

  // ─── CACHE ─────────────────────────────────────
  // Включаем год чтобы январь 2027 не вернул данные января 2026
  const CACHE_YEAR = new Date().getFullYear();
  function cacheKey(m) { return 'daracom_opiu_' + CACHE_YEAR + '_' + m; }

  function loadFromCache(m) {
    try {
      const raw = localStorage.getItem(cacheKey(m));
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < CONFIG.CACHE_TTL_MS) return { data, ts };
    } catch(e) {}
    return null;
  }

  function saveToCache(m, data) {
    try {
      localStorage.setItem(cacheKey(m), JSON.stringify({ ts: Date.now(), data }));
    } catch(e) {}
  }

  // ─── FETCH ─────────────────────────────────────
  async function loadData(forceRefresh = false) {
    setState('loading');

    if (!forceRefresh) {
      const cached = loadFromCache(currentMonth);
      if (cached) {
        renderDashboard(cached.data, cached.ts);
        return;
      }
    }

    try {
      const url = CONFIG.GAS_URL + '?action=opiu&month=' + currentMonth;
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'Ошибка GAS');
      saveToCache(currentMonth, json.data);
      renderDashboard(json.data, Date.now());
    } catch(err) {
      showError(err.message);
    }
  }

  // ─── STATES ────────────────────────────────────
  function setState(s) {
    ['loading','error','empty','content'].forEach(id => {
      const el = document.getElementById('state' + id.charAt(0).toUpperCase() + id.slice(1));
      if (!el) return;
      el.classList.toggle('hidden', id !== s);
      el.classList.toggle('flex', id === s && s !== 'content');
    });
  }

  function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
    setState('error');
  }

  // ─── FORMAT ────────────────────────────────────
  function fmtShort(n) {
    if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + ' млрд';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + ' млн';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + ' тыс';
    return String(Math.round(n));
  }

  // ─── RENDER ────────────────────────────────────
  function renderDashboard(data, ts) {
    if (!data || !data.rows || data.rows.length === 0) {
      setState('empty');
      return;
    }
    currentData = data;

    // Header subtitle
    const d = new Date(ts);
    const hhmm = d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    document.getElementById('headerSub').textContent = MONTH_NAMES[data.month] + ' 2026 · данные от ' + hhmm;

    // Build revenue map: store → revenue value (for % calc)
    const revenueMap = {};
    const revRow = data.rows.find(r => r.label === 'Выручка');
    if (revRow) {
      data.stores.forEach(s => { revenueMap[s] = revRow.values[s] || 0; });
      revenueMap['Итого'] = revRow.values['Итого'] || 0;
    }

    const cols = [...data.stores, 'Итого'];

    // Render thead
    const thead = document.getElementById('plHead');
    thead.innerHTML = '<tr>' +
      '<th>Метрика</th>' +
      cols.map(s => '<th>' + s.replace('Магазин ', '') + '</th>').join('') +
      '</tr>';

    // Render tbody
    const tbody = document.getElementById('plBody');
    tbody.innerHTML = data.rows.map(row => renderRow(row, cols, revenueMap)).join('');

    setState('content');
  }

  function renderRow(row, cols, revenueMap) {
    const isGroup = row.type === 'group';
    const noPercent = row.label === 'Выручка' || row.parent === 'Выручка';
    const bgCls = isGroup ? (GROUP_BG[row.label] || '') : '';
    const rowCls = (isGroup ? 'pl-row-group ' + bgCls : 'pl-row-item');

    const cells = cols.map(col => {
      const val = row.values[col];
      const rev = revenueMap[col];

      if (val === undefined || val === null || val === 0) {
        return '<td><span class="cell-dash">—</span></td>';
      }

      const fmtVal = fmtShort(val);
      let pctHtml = '';

      if (!noPercent && rev && rev !== 0) {
        const pct = (val / rev * 100).toFixed(1);
        pctHtml = '<div class="cell-pct">(' + pct + '%)</div>';
      }

      return '<td><div class="cell-val">' + fmtVal + '</div>' + pctHtml + '</td>';
    }).join('');

    return '<tr class="' + rowCls + '"><td>' + escHtml(row.label) + '</td>' + cells + '</tr>';
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  </script>

</body>
</html>
```

- [ ] **Шаг 2: Проверить страницу локально**

Открыть `opiu.html` в браузере (file://...). Ожидаем:
- Header отображается корректно
- Переключатель месяца по умолчанию = текущий месяц (Март)
- Данные грузятся, таблица отображается
- Строки-группы жирные с цветным фоном
- Подстатьи с отступом
- Числа форматированы (млн/тыс)
- % отображается для всех строк кроме Выручка и её подстатей
- Кнопка ↻ Обновить сбрасывает кэш и перегружает

- [ ] **Шаг 3: Коммит `opiu.html`**

```bash
cd "C:\Users\Asus\Desktop\ClaudeSheets"
git add opiu.html
git commit -m "feat: add opiu.html P&L dashboard"
```

---

## Task 3: Навигация — кнопки `ОПиУ →` в `dashboard.html` и `dds.html`

**Files:**
- Modify: `dashboard.html` — строка 69 (между `</div>` и `<select id="monthSel"`)
- Modify: `dds.html` — строка 206 (между `← Финотчёт` и `↻ Обновить`)

- [ ] **Шаг 1: Добавить `ОПиУ →` в `dashboard.html`**

Найти в `dashboard.html` строку:
```html
      <a href="dds.html" class="bg-surface2 border border-border text-white text-sm rounded-lg px-3 py-2 font-medium hover:border-accent transition-colors">ДДС →</a>
```

Добавить после неё:
```html
      <a href="opiu.html" class="bg-surface2 border border-border text-white text-sm rounded-lg px-3 py-2 font-medium hover:border-accent transition-colors">ОПиУ →</a>
```

- [ ] **Шаг 2: Добавить `ОПиУ →` в `dds.html`**

Найти в `dds.html` строку:
```html
    <a href="dashboard.html" class="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">← Финотчёт</a>
```

Добавить после неё:
```html
    <a href="opiu.html" class="text-sm text-gray-500 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">ОПиУ →</a>
```

- [ ] **Шаг 3: Проверить навигацию**

Открыть `dashboard.html` и убедиться что кнопка `ОПиУ →` есть и ведёт на `opiu.html`. То же для `dds.html`.

- [ ] **Шаг 4: Коммит навигации**

```bash
cd "C:\Users\Asus\Desktop\ClaudeSheets"
git add dashboard.html dds.html
git commit -m "feat: add ОПиУ nav link to dashboard.html and dds.html"
```

---

## Task 4: Deploy на GitHub Pages

- [ ] **Шаг 1: Push на GitHub**

Нужен PAT токен (scope: repo). Запросить у пользователя через AskUserQuestion если ещё не авторизован.

```bash
cd "C:\Users\Asus\Desktop\ClaudeSheets"
git push origin main
```

Ожидаем: `Branch 'main' set up to track remote branch 'main' of 'origin'.`

- [ ] **Шаг 2: Проверить на GitHub Pages**

Открыть: `https://edigeabdikarim.github.io/daracom-analytics/opiu.html`

Ожидаем: страница открывается, данные загружаются.

---

## Порядок выполнения

```
Task 1 (GAS) → Task 2 (opiu.html) → Task 3 (nav) → Task 4 (deploy)
```

Tasks 2 и 3 можно делать параллельно после Task 1.
