# По магазинам: переход на данные ДДС Гульжан А.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести раздел «По магазинам» с кассовых данных на начислительные данные `buildGulzhanData()` с подсветкой сдвигов и статусом «ожидает оплаты».

**Architecture:** Рефакторинг `renderStoreGrid()` в `dds.html` — офисные магазины (Компания, Офис) остаются на `filteredRows`, торговые переходят на `buildGulzhanData(currentMonth)`. Три новые helper-функции определяют shift-тип статьи/группы. CSS-классы `.gul-*` уже существуют.

**Tech Stack:** Vanilla JS, HTML, CSS-классы `.gul-advance/.gul-prevmonth/.gul-quarterly/.gul-mixed`

---

## Файлы

| Файл | Изменение |
|---|---|
| `dds.html:919-932` | Добавить 3 helper-функции перед `renderStoreGrid()` |
| `dds.html:934-1078` | Полностью заменить тело `renderStoreGrid()` |

---

### Task 1: Добавить helper-функции

**Files:**
- Modify: `dds.html:932` (после `STORE_GROUP_ORDER`, перед `function renderStoreGrid()`)

- [ ] **Шаг 1: Вставить 3 helper-функции**

Найти строку:
```js
// По магазинам = группировка всех строк (activity!=='Техническая операция') по store
function renderStoreGrid() {
```

Заменить на:
```js
// Shift-тип статьи для конкретного магазина
function getArticleShiftType(articleName, storeName) {
  if (GULZHAN_ADVANCE_ARTICLES.has(articleName)) return 'advance';
  if (GULZHAN_PREV_MONTH_ARTICLES.has(articleName)) return 'prevmonth';
  if (GULZHAN_PREVMONTH_STORES[articleName] && GULZHAN_PREVMONTH_STORES[articleName].has(storeName)) return 'prevmonth';
  if (GULZHAN_QUARTERLY_STORES.hasOwnProperty(articleName)) {
    const qStores = GULZHAN_QUARTERLY_STORES[articleName];
    if (qStores === null || qStores.has(storeName)) return 'quarterly';
  }
  return null;
}

// Shift-тип группы (агрегированный по всем статьям группы)
function getGroupShiftType(groupName) {
  const types = new Set();
  DDS_ARTICLES_ORDER.forEach(a => {
    if (a.group !== groupName) return;
    if (GULZHAN_PREV_MONTH_ARTICLES.has(a.article) || GULZHAN_PREVMONTH_STORES[a.article]) types.add('prevmonth');
    else if (GULZHAN_QUARTERLY_STORES.hasOwnProperty(a.article)) types.add('quarterly');
  });
  if (types.size === 0) return null;
  if (types.size === 1) return [...types][0];
  return 'mixed';
}

// Есть ли в группе хоть одна prevmonth/quarterly статья
function groupHasShiftedArticles(groupName) {
  return getGroupShiftType(groupName) !== null;
}

// По магазинам = торговые через buildGulzhanData(), офисные через filteredRows
function renderStoreGrid() {
```

- [ ] **Шаг 2: Открыть `dds.html` в браузере → секция «По магазинам», убедиться что нет JS-ошибок в консоли**

---

### Task 2: Заменить тело renderStoreGrid()

**Files:**
- Modify: `dds.html:934-1078`

- [ ] **Шаг 1: Удалить всё тело `renderStoreGrid()` и вставить новое**

Найти всё от `const OFFICE_STORES = new Set(['Компания', 'Офис']);` до (включая) строки перед `}` (закрывающая скобка функции на ~line 1078), заменить на:

```js
  const OFFICE_STORES = new Set(['Компания', 'Офис']);
  const EXCLUDED_GROUPS = new Set(['Платежи', 'Основные средства', 'Финансирование', 'Продажи']);

  // Загружаем смежные месяцы для Gulzhan-логики
  ensureMonthLoaded(currentMonth - 1);
  ensureMonthLoaded(currentMonth + 1);
  const _qPayM = quarterPaymentMonth(currentMonth);
  if (_qPayM <= 12) ensureMonthLoaded(_qPayM);
  const _qStart = Math.ceil(currentMonth / 3) * 3 - 2;
  [_qStart, _qStart + 1, _qStart + 2].forEach(m => { if (m >= 1 && m <= 12) ensureMonthLoaded(m); });

  // ── Офисные магазины: filteredRows (без изменений) ──────────────────
  const officeMap = {};
  filteredRows.forEach(r => {
    if (r.activity === 'Техническая операция' || !r.store || !OFFICE_STORES.has(r.store)) return;
    if (!officeMap[r.store]) officeMap[r.store] = { inc: 0, out: 0, groups: {}, incGroups: {} };
    const grp = ARTICLE_GROUP[r.article] || 'Прочее';
    if (r.type === 'Поступление') {
      officeMap[r.store].inc += r.amount;
      officeMap[r.store].incGroups[grp] = (officeMap[r.store].incGroups[grp] || 0) + r.amount;
    }
    if (r.type === 'Выбытие') {
      const amt = Math.abs(r.amount);
      officeMap[r.store].out += amt;
      officeMap[r.store].groups[grp] = (officeMap[r.store].groups[grp] || 0) + amt;
    }
  });

  // ── Торговые магазины: buildGulzhanData ──────────────────────────────
  const { stores: gulStores, groups: gulGroups } = buildGulzhanData(currentMonth);
  const salesGroup = gulGroups.find(g => g.name === 'Продажи');

  const tradeMap = {};
  gulStores.filter(s => !OFFICE_STORES.has(s)).forEach(store => {
    const salesTotal = salesGroup ? (salesGroup.subtotals[store] || 0) : 0;
    const expGroups  = gulGroups.filter(g => !EXCLUDED_GROUPS.has(g.name) && g.isIncome === false);
    const displayOut = Math.abs(expGroups.reduce((s, g) => s + (g.subtotals[store] || 0), 0));
    tradeMap[store] = { salesTotal, displayOut };
  });

  // ── Сортируем и объединяем ───────────────────────────────────────────
  const tradeEntries  = Object.entries(tradeMap)
    .sort((a, b) => (b[1].salesTotal + b[1].displayOut) - (a[1].salesTotal + a[1].displayOut));
  const officeEntries = Object.entries(officeMap)
    .sort((a, b) => (b[1].inc + b[1].out) - (a[1].inc + a[1].out));
  const allStores = [...tradeEntries.map(([n]) => n), ...officeEntries.map(([n]) => n)];

  const grid = document.getElementById('storeGrid');
  if (allStores.length === 0) { grid.innerHTML = '<p class="text-gray-400 text-sm">Нет данных</p>'; return; }

  const prevMonthName = currentMonth > 1 ? MONTH_NAMES[currentMonth - 2] : 'дек. 2025';
  const nextMonthName = currentMonth < 12 ? MONTH_NAMES[currentMonth] : '—';
  const RENT_ARTICLE_NAMES = DDS_ARTICLES_ORDER.filter(a => a.group === 'Аренда и ком. услуги').map(a => a.article);
  const rentGroup = gulGroups.find(g => g.name === 'Аренда и ком. услуги');

  // Хелперы для строк: CSS-класс и shift-лейбл
  const rowCls = st =>
    st === 'advance'    ? ' gul-advance'
    : st === 'prevmonth'  ? ' gul-prevmonth'
    : st === 'quarterly'  ? ' gul-quarterly'
    : st === 'mixed'      ? ' gul-mixed'
    : '';
  const shiftLbl = st =>
    st === 'advance'    ? `<span class="gul-shift-label">▲ ${escHtml(prevMonthName)}</span>`
    : st === 'prevmonth'  ? `<span class="gul-shift-label">▼ ${escHtml(nextMonthName)}</span>`
    : st === 'quarterly'  ? `<span class="gul-shift-label">◇ квартальные</span>`
    : st === 'mixed'      ? `<span class="gul-shift-label">◆ сдвиг по части</span>`
    : '';

  grid.innerHTML = allStores.map(name => {
    const isOffice = OFFICE_STORES.has(name);

    // ── Офисная карточка ────────────────────────────────────────────────
    if (isOffice) {
      const d = officeMap[name];
      const cf = d.inc - d.out;
      const cfColor = cf >= 0 ? '#10B981' : '#EF4444';
      const groups    = Object.entries(d.groups).sort((a, b) => b[1] - a[1]);
      const incGroups = Object.entries(d.incGroups).sort((a, b) => b[1] - a[1]);
      const groupRows = groups.map(([grpName, amt]) =>
        `<tr>
          <td style="padding:3px 6px;color:#374151;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(grpName)}</td>
          <td style="padding:3px 6px;color:#EF4444;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
        </tr>`
      ).join('');
      const incGroupRows = incGroups.map(([grpName, amt]) =>
        `<tr>
          <td style="padding:3px 6px;color:#374151;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(grpName)}</td>
          <td style="padding:3px 6px;color:#10B981;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
        </tr>`
      ).join('');
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
        </div>` : ''}
        ${groups.length ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #F3F4F6;">
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Выбытия по группам</div>
          <table style="width:100%;border-collapse:collapse;">${groupRows}</table>
        </div>` : ''}
      </div>`;
    }

    // ── Торговая карточка (Gulzhan) ─────────────────────────────────────
    const { salesTotal, displayOut } = tradeMap[name];
    const cf       = salesTotal - displayOut;
    const cfColor  = cf >= 0 ? '#10B981' : '#EF4444';
    const pct      = salesTotal > 0 ? displayOut / salesTotal * 100 : 0;
    const pctColor = pct < 80 ? '#059669' : pct < 100 ? '#D97706' : '#DC2626';
    const pctBg    = pct < 80 ? '#D1FAE5' : pct < 100 ? '#FEF3C7' : '#FEE2E2';
    const barFill  = Math.min(pct, 100).toFixed(1);

    // Аренда: индивидуальные статьи
    const rentRows = rentGroup ? RENT_ARTICLE_NAMES.flatMap(artName => {
      const artObj = rentGroup.articles.find(a => a.name === artName);
      if (!artObj) return [];
      const amt       = Math.abs(artObj.byStore[name] || 0);
      const shiftType = getArticleShiftType(artName, name);
      const isPending = (shiftType === 'prevmonth' || shiftType === 'quarterly') && amt < 0.01;
      if (amt < 0.01 && !isPending) return [];
      return [{ label: artName, amt, shiftType, isPending }];
    }) : [];

    // Остальные группы (кроме аренды): одна строка на группу
    const otherRows = gulGroups
      .filter(g => !EXCLUDED_GROUPS.has(g.name) && g.name !== 'Аренда и ком. услуги' && g.isIncome === false)
      .sort((a, b) => {
        const ai = STORE_GROUP_ORDER.indexOf(a.name);
        const bi = STORE_GROUP_ORDER.indexOf(b.name);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .flatMap(g => {
        const amt       = Math.abs(g.subtotals[name] || 0);
        const shiftType = getGroupShiftType(g.name);
        const isPending = amt < 0.01 && groupHasShiftedArticles(g.name);
        if (amt < 0.01 && !isPending) return [];
        return [{ label: g.name, amt, shiftType, isPending }];
      });

    const allRows = [...rentRows, ...otherRows];

    const groupRows = allRows.map(({ label, amt, shiftType, isPending }) => {
      const cls   = rowCls(shiftType);
      const slbl  = shiftLbl(shiftType);
      if (isPending) {
        return `<tr class="${cls}">
          <td style="padding:3px 6px;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(label)}${slbl}</td>
          <td colspan="2" style="padding:3px 6px;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;color:#9CA3AF;white-space:nowrap;">⏳ ожидает оплаты</td>
        </tr>`;
      }
      const gp = salesTotal > 0 ? (amt / salesTotal * 100).toFixed(0) : '0';
      return `<tr class="${cls}">
        <td style="padding:3px 6px;color:#374151;font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(label)}${slbl}</td>
        <td style="padding:3px 6px;color:#EF4444;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
        <td style="padding:3px 6px;color:#6B7280;font-weight:700;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${gp}%</td>
      </tr>`;
    }).join('');

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
        ${allRows.length ? `
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Выбытия по группам</div>
          <table style="width:100%;border-collapse:collapse;">${groupRows}</table>
        ` : ''}
      </div>
      ` : ''}
    </div>`;
  }).join('');

  // Заполняем блок остатков для печати
  const sprintBal   = monthlyBalance ? calcBalance(currentMonth) : null;
  const sprintOpen  = document.getElementById('sprintBalOpen');
  const sprintClose = document.getElementById('sprintBalClose');
  if (sprintOpen  && sprintBal) sprintOpen.textContent  = fmt(sprintBal.balanceStart) + ' ₸';
  if (sprintClose && sprintBal) sprintClose.textContent = fmt(sprintBal.balanceEnd)   + ' ₸';
```

- [ ] **Шаг 2: Открыть браузер → «По магазинам» → убедиться что карточки торговых магазинов отображаются**

  Ожидаемое:
  - Карточки торговых магазинов с данными (Продажи / Выбытия / Чистый CF)
  - Аренда разбита по статьям с `▲ [месяц]` лейблом
  - Зарплаты с `▼ [след. месяц]` или `⏳ ожидает оплаты`
  - Налоги с `◆ сдвиг по части`
  - Компания/Офис — без изменений

- [ ] **Шаг 3: Проверить «ожидает оплаты»**

  Выбрать текущий месяц (напр. март). Зарплаты берутся из апреля. Если апрель не заполнен → все зарплатные строки показывают `⏳ ожидает оплаты` с сиреневым фоном.

---

### Task 3: Commit

- [ ] **Шаг 1: Сделать коммит**

```bash
git add dds.html
git commit -m "feat(stores): migrate По магазинам to Gulzhan accrual data with shift labels"
```

---

## Self-Review

### Покрытие спека
- ✅ Данные из `buildGulzhanData()` — Task 2
- ✅ Офис/Компания без изменений — Task 2 (officeMap path)
- ✅ Shift-лейблы на аренда-статьях — Task 2 (`rentRows`)
- ✅ Shift-лейблы на группах — Task 2 (`otherRows`)
- ✅ «Ожидает оплаты» для prevmonth/quarterly = 0 — Task 2 (`isPending`)
- ✅ Advance (аренда M-1) никогда не "ожидает" — `getArticleShiftType` возвращает 'advance', isPending = false
- ✅ `ensureMonthLoaded` для смежных месяцев — Task 2

### Проверка типов
- `getArticleShiftType(string, string) → string|null` — используется в Task 2 `rentRows`
- `getGroupShiftType(string) → string|null` — используется в Task 2 `otherRows` и `groupHasShiftedArticles`
- `groupHasShiftedArticles(string) → boolean` — используется в Task 2 `isPending`
- `gulGroups[].subtotals[storeName]` — отрицательные числа для выбытий, `Math.abs()` применяется везде ✅
- `artObj.byStore[name]` — отрицательные числа для выбытий, `Math.abs()` применяется ✅
