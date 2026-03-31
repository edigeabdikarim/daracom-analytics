# ДДС Гульжан А. + Магазины — доработки и печать: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Улучшить разделы «ДДС Гульжан А.» и «По магазинам» в `dds.html`: логические правки матрицы, переименование, иерархические группы в карточках, настройки печати.

**Architecture:** Все изменения — только в `dds.html`. GAS не затрагивается. Изменения разбиты на независимые задачи: сначала логические правки данных, затем UI/карточки, затем CSS печати.

**Tech Stack:** Vanilla JS, HTML/CSS, Google Apps Script (не затрагивается)

---

### Task 1: buildGulzhanData — удалить «Общее» колонку и «Прочее» группу

**Files:**
- Modify: `dds.html:1503-1532`

- [ ] **Step 1: Убрать «Общее» из extraStores**

Найти строку (~1503–1505):
```js
const extraStores = Object.keys(storeTurnover)
  .filter(s => !knownStores.has(s) && s !== 'Компания')
  .sort((a, b) => a.localeCompare(b, 'ru'));
```
Заменить на:
```js
const extraStores = Object.keys(storeTurnover)
  .filter(s => !knownStores.has(s) && s !== 'Компания' && s !== 'Общее')
  .sort((a, b) => a.localeCompare(b, 'ru'));
```

- [ ] **Step 2: Удалить создание группы «Прочее»**

Найти и удалить блок (~1527–1532):
```js
  // Статьи не в списке → группа «Прочее»
  const knownArticles = new Set(DDS_ARTICLES_ORDER.map(a => a.article));
  const extraArticles = Object.keys(cellData).filter(art => !knownArticles.has(art));
  if (extraArticles.length > 0) {
    groupsMap.set('Прочее', { name: 'Прочее', isIncome: null, articleNames: extraArticles });
  }
```

- [ ] **Step 3: Открыть dds.html в браузере, перейти в «ДДС Гульжан А.», выбрать любой месяц**

Убедиться:
- Колонки «Общее» нет в матрице
- Строк группы «Прочее» нет в матрице
- Остальные данные отображаются корректно

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(gulzhan): remove Общее column and Прочее group from matrix"
```

---

### Task 2: GULZHAN_PREV_MONTH_ARTICLES — добавить «Ком услуги»

**Files:**
- Modify: `dds.html:1448-1456`

- [ ] **Step 1: Добавить «Ком услуги» в константу**

Найти (~1448):
```js
const GULZHAN_PREV_MONTH_ARTICLES = new Set([
  'Зарплата Продавцы',
  'Зарплата Офис',
  'Зарплата Аутсорс',
  'Зарплата Техперсонал',
  'Зарплата СММ маркетинг, мерчандайзер',
  'Зарплата Водитель',
  'Налоги ЗП',
]);
```
Заменить на:
```js
const GULZHAN_PREV_MONTH_ARTICLES = new Set([
  'Зарплата Продавцы',
  'Зарплата Офис',
  'Зарплата Аутсорс',
  'Зарплата Техперсонал',
  'Зарплата СММ маркетинг, мерчандайзер',
  'Зарплата Водитель',
  'Налоги ЗП',
  'Ком услуги',
]);
```

- [ ] **Step 2: Проверить в браузере**

В «ДДС Гульжан А.» матрице: строка «Ком услуги» должна иметь метку `▼` и фиолетовый фон (`gul-prevmonth`).
В карточках раздела (следующие задачи): «Ком услуги» будет показывать `⏳ ожидает оплаты` при нулевом значении.

- [ ] **Step 3: Commit**

```bash
git add dds.html
git commit -m "feat(gulzhan): add Ком услуги to prevmonth shift articles"
```

---

### Task 3: isCellAlwaysPaid() + «⏳» в ячейках матрицы

**Files:**
- Modify: `dds.html:1467` (после `GULZHAN_QUARTERLY_STORES`)
- Modify: `dds.html:1960-1962` (isZero в renderGulzhanMatrix)
- Modify: `dds.html:1998-2000` (рендер ячеек store в renderGulzhanMatrix)

- [ ] **Step 1: Добавить функцию isCellAlwaysPaid**

После блока `GULZHAN_QUARTERLY_STORES` (~строка 1467) добавить:
```js
function isCellAlwaysPaid(articleName, storeName) {
  if (GULZHAN_PREV_MONTH_ARTICLES.has(articleName)) return true;
  if (GULZHAN_PREVMONTH_STORES[articleName] && GULZHAN_PREVMONTH_STORES[articleName].has(storeName)) return true;
  if (GULZHAN_QUARTERLY_STORES.hasOwnProperty(articleName)) {
    const qStores = GULZHAN_QUARTERLY_STORES[articleName];
    if (qStores === null || qStores.has(storeName)) return true;
  }
  return false;
}
```

- [ ] **Step 2: Изменить логику isZero в renderGulzhanMatrix**

Найти (~1961):
```js
      const isZero      = Math.abs(a.total) < 0.01;
```
Заменить на:
```js
      const hasAlwaysPaidCell = stores.some(s => isCellAlwaysPaid(a.name, s));
      const isZero      = Math.abs(a.total) < 0.01 && !hasAlwaysPaidCell;
```

- [ ] **Step 3: Изменить рендер ячеек магазинов**

Найти (~1998–2000):
```js
        stores.forEach(s => {
          html += `<td>${renderSummaryCell(a.byStore[s] || 0)}</td>`;
        });
```
Заменить на:
```js
        stores.forEach(s => {
          if (isCellAlwaysPaid(a.name, s) && Math.abs(a.byStore[s] || 0) < 0.01) {
            html += `<td style="text-align:center;color:#9CA3AF;font-size:11px;">⏳</td>`;
          } else {
            html += `<td>${renderSummaryCell(a.byStore[s] || 0)}</td>`;
          }
        });
```

- [ ] **Step 4: Проверить в браузере**

Выбрать январь (или любой не-квартальный месяц). Проверить:
- «Зарплата Продавцы» — во всех магазинах `⏳` если нет данных
- «Налоги ИП (квартальные)» — все ячейки показывают `⏳` в не-квартальный месяц, строка НЕ скрывается при «Скрыть нулевые»
- «Аренда переменная» — `⏳` только у Астана, Above Астана, Есентай

- [ ] **Step 5: Commit**

```bash
git add dds.html
git commit -m "feat(gulzhan): show pending cells in matrix for always-paid articles"
```

---

### Task 4: renderStoreGrid — группа «Аренда и ком. услуги» с заголовком

**Files:**
- Modify: `dds.html:1093-1157` (торговая карточка)

- [ ] **Step 1: Заменить блок rentRows + otherRows + allRows + groupRows**

Найти весь блок (~1093–1157):
```js
    // Аренда: индивидуальные статьи
    const rentRows = rentGroup ? RENT_ARTICLE_NAMES.flatMap(artName => {
      ...
    }) : [];

    // Остальные группы (кроме аренды): одна строка на группу
    const otherRows = sortedExpGroups
      .flatMap(g => {
        ...
      });

    const allRows = [...rentRows, ...otherRows];

    const groupRows = allRows.map(({ label, amt, shiftType, isPending }) => {
      ...
    }).join('');
```

Заменить на (до строки с `return \`<div class="store-card"`):
```js
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

    // Налоги: индивидуальные статьи (аналогично аренде)
    const taxGroup = gulGroups.find(g => g.name === 'Налоги');
    const TAX_ARTICLE_NAMES = DDS_ARTICLES_ORDER.filter(a => a.group === 'Налоги').map(a => a.article);
    const taxRows = taxGroup ? TAX_ARTICLE_NAMES.flatMap(artName => {
      const artObj = taxGroup.articles.find(a => a.name === artName);
      if (!artObj) return [];
      const amt       = Math.abs(artObj.byStore[name] || 0);
      const shiftType = getArticleShiftType(artName, name);
      const isPending = (shiftType === 'prevmonth' || shiftType === 'quarterly') && amt < 0.01;
      if (amt < 0.01 && !isPending) return [];
      return [{ label: artName, amt, shiftType, isPending }];
    }) : [];

    // Остальные группы (кроме аренды и налогов): одна строка на группу
    const otherRows = sortedExpGroups
      .flatMap(g => {
        const amt       = Math.abs(g.subtotals[name] || 0);
        const shiftType = getGroupShiftType(g.name);
        const isPending = groupHasShiftedArticles(g.name) && amt < 0.01;
        if (amt < 0.01 && !isPending) return [];
        return [{ label: g.name, amt, shiftType, isPending }];
      });

    // Хелпер рендера строки (с опциональным отступом)
    const renderRow = ({ label, amt, shiftType, isPending }, indent) => {
      const cls  = rowCls(shiftType);
      const slbl = shiftLbl(shiftType);
      const pl   = indent ? 'padding:3px 6px 3px 18px' : 'padding:3px 6px';
      const tc   = indent ? '#6B7280' : '#374151';
      if (isPending) {
        return `<tr class="${cls}">
          <td style="${pl};font-size:11px;border-bottom:1px solid #E5E7EB;color:${tc};">${escHtml(label)}${slbl}</td>
          <td colspan="2" style="padding:3px 6px;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;color:#9CA3AF;white-space:nowrap;">⏳ ожидает оплаты</td>
        </tr>`;
      }
      const gp = salesTotal > 0 ? (amt / salesTotal * 100).toFixed(0) : '0';
      return `<tr class="${cls}">
        <td style="${pl};color:${tc};font-size:11px;border-bottom:1px solid #E5E7EB;">${escHtml(label)}${slbl}</td>
        <td style="padding:3px 6px;color:#EF4444;font-weight:600;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(amt)}</td>
        <td style="padding:3px 6px;color:#6B7280;font-weight:700;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${gp}%</td>
      </tr>`;
    };

    // Рендер группы с заголовком и вложенными подстатьями
    const renderGroupBlock = (groupName, rows) => {
      if (rows.length === 0) return '';
      const groupTotal = rows.reduce((s, r) => s + r.amt, 0);
      const groupPct   = salesTotal > 0 ? (groupTotal / salesTotal * 100).toFixed(0) : '0';
      const header = `<tr style="background:#F0F4F8;">
        <td style="padding:3px 6px;font-size:11px;font-weight:700;color:#1E3A5F;border-bottom:1px solid #E5E7EB;">${escHtml(groupName)}</td>
        <td style="padding:3px 6px;color:#EF4444;font-weight:700;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${fmtShort(groupTotal)}</td>
        <td style="padding:3px 6px;color:#6B7280;font-weight:700;text-align:right;font-size:11px;border-bottom:1px solid #E5E7EB;white-space:nowrap;">${groupPct}%</td>
      </tr>`;
      return header + rows.map(r => renderRow(r, true)).join('');
    };

    const groupRows =
      renderGroupBlock('Аренда и ком. услуги', rentRows) +
      renderGroupBlock('Налоги', taxRows) +
      otherRows.map(r => renderRow(r, false)).join('');
    const hasGroupRows = rentRows.length > 0 || taxRows.length > 0 || otherRows.length > 0;
```

- [ ] **Step 2: Заменить allRows.length на hasGroupRows в шаблоне карточки**

Найти (~1150):
```js
        ${allRows.length ? `
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Выбытия по группам</div>
          <table style="width:100%;border-collapse:collapse;">${groupRows}</table>
        ` : ''}
```
Заменить на:
```js
        ${hasGroupRows ? `
          <div style="font-size:10px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:5px;">Выбытия по группам</div>
          <table style="width:100%;border-collapse:collapse;">${groupRows}</table>
        ` : ''}
```

- [ ] **Step 3: Исключить «Налоги» из sortedExpGroups**

Найти (~1020–1026):
```js
  const sortedExpGroups = gulGroups
    .filter(g => !EXCLUDED_GROUPS.has(g.name) && g.name !== 'Аренда и ком. услуги' && g.isIncome === false)
```
Заменить на:
```js
  const sortedExpGroups = gulGroups
    .filter(g => !EXCLUDED_GROUPS.has(g.name) && g.name !== 'Аренда и ком. услуги' && g.name !== 'Налоги' && g.isIncome === false)
```

- [ ] **Step 4: Проверить в браузере**

Открыть «ДДС Магазины Гульжан А.» (или «По магазинам»), выбрать торговый магазин.  
Убедиться:
- Блок «Аренда и ком. услуги» показывает заголовок с суммой, под ним — статьи с отступом
- Блок «Налоги» показывает заголовок с суммой, под ним — «Налоги ЗП», «Налоги ИП (квартальные)», «Налоги»
- Нулевые обычные статьи скрыты, pending показывают «⏳ ожидает оплаты»

- [ ] **Step 5: Commit**

```bash
git add dds.html
git commit -m "feat(stores): add group headers with sub-articles for Аренда and Налоги"
```

---

### Task 5: Переименование «По магазинам» → «ДДС Магазины Гульжан А.»

**Files:**
- Modify: `dds.html` (nav-item, section-title, storesPrintHeader)

- [ ] **Step 1: Переименовать nav-item**

Найти (~319):
```html
      <div class="nav-item" onclick="setSection('stores')" id="nav-stores">
        <span class="nav-icon">🏪</span> По магазинам
      </div>
```
Заменить:
```html
      <div class="nav-item" onclick="setSection('stores')" id="nav-stores">
        <span class="nav-icon">🏪</span> ДДС Магазины Гульжан А.
      </div>
```

- [ ] **Step 2: Переименовать section-title**

Найти в секции `#section-stores` заголовок `<h2 class="section-title">По магазинам</h2>` и заменить на:
```html
<h2 class="section-title">ДДС Магазины Гульжан А.</h2>
```

- [ ] **Step 3: Commit**

```bash
git add dds.html
git commit -m "feat(stores): rename section to ДДС Магазины Гульжан А."
```

---

### Task 6: Печать — CSS: повторяющиеся шапки + нумерация страниц

**Files:**
- Modify: `dds.html:209-253` (блок `@media print`)

- [ ] **Step 1: Добавить `position: fixed` к print-заголовкам и нумерацию**

Найти в `@media print` (~225):
```css
      #summaryPrintHeader { display: block !important; }
```
Заменить на:
```css
      #summaryPrintHeader,
      #gulzhanPrintHeader,
      #storesPrintHeader {
        display: block !important;
        position: fixed;
        top: 0; left: 0; right: 0;
        background: #fff;
        padding: 10px 16px 8px;
        z-index: 100;
        border-bottom: 2px solid #1E3A5F !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      #section-gulzhan.active,
      #section-summary.active,
      #section-stores.active { padding-top: 68px !important; }
      .print-page-counter {
        display: block !important;
        position: fixed;
        bottom: 8px; right: 16px;
        font-size: 10px; color: #9CA3AF;
      }
      .print-page-counter::after { content: "Стр. " counter(page); }
```

Также найти и удалить отдельную строку:
```css
      #storesPrintHeader { display: block !important; }
```
(она теперь дублирует общий блок выше — убрать, чтобы не было конфликта)

- [ ] **Step 2: Добавить элемент `.print-page-counter` в HTML**

После закрывающего `</div><!-- /stateContent -->` (строка ~500) добавить:
```html
<div class="print-page-counter" style="display:none;"></div>
```

- [ ] **Step 3: Проверить печать в браузере**

Открыть «ДДС Гульжан А.», нажать «Печать» → предпросмотр.  
Убедиться: шапка видна на каждой странице, номер страницы снизу справа.  
Проверить то же для «Сводная ДДС».

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(print): repeating headers on each page + page counter"
```

---

### Task 7: Печать — убрать остатки из Гульжан и Сводной

**Files:**
- Modify: `dds.html:1913-1924` (renderGulzhanMatrix — printBalEl)
- Modify: `dds.html:1615-1625` (renderSummaryMatrix — printBalEl)

- [ ] **Step 1: Убрать наполнение gulzhanPrintBalances**

Найти в `renderGulzhanMatrix` (~1913):
```js
  const printBalEl = document.getElementById('gulzhanPrintBalances');
  if (printBalEl) {
    printBalEl.innerHTML = `
      <div style="display:flex;flex-direction:column">
        <span style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em">Остаток на начало</span>
        <span style="font-size:13px;font-weight:700;color:#1E3A5F;margin-top:2px">${fmt(balanceStart)} ₸</span>
      </div>
      <div style="display:flex;flex-direction:column">
        <span style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em">Остаток на конец</span>
        <span style="font-size:13px;font-weight:700;color:#1E3A5F;margin-top:2px">${fmt(balanceEnd)} ₸</span>
      </div>`;
  }
```
Удалить этот блок целиком.

- [ ] **Step 2: Убрать наполнение summaryPrintBalances**

Найти в `renderSummaryMatrix` (~1615):
```js
  const printBalEl = document.getElementById('summaryPrintBalances');
  if (printBalEl) {
    printBalEl.innerHTML = `
      <div style="display:flex;flex-direction:column">
        <span style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em">Остаток на начало</span>
        <span style="font-size:13px;font-weight:700;color:#1E3A5F;margin-top:2px">${fmt(balanceStart)} ₸</span>
      </div>
      <div style="display:flex;flex-direction:column">
        <span style="font-size:10px;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:0.04em">Остаток на конец</span>
        <span style="font-size:13px;font-weight:700;color:#1E3A5F;margin-top:2px">${fmt(balanceEnd)} ₸</span>
      </div>`;
  }
```
Удалить этот блок целиком.

- [ ] **Step 3: Проверить в браузере**

Нажать «Печать» в «ДДС Гульжан А.» и «Сводная» — остатков в шапке быть не должно.  
В обычном виде чипы `#gulzhanBalanceChips` / `#summaryBalanceChips` должны остаться.

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(print): remove balance chips from Gulzhan and Summary print headers"
```

---

### Task 8: Печать — перестроить шапку «ДДС Магазины Гульжан А.»

**Files:**
- Modify: `dds.html:483-495` (HTML шапки `#storesPrintHeader`)
- Modify: `dds.html:1159-1164` (JS в renderStoreGrid)

- [ ] **Step 1: Заменить HTML #storesPrintHeader**

Найти (~483–495):
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
```
Заменить на:
```html
        <div id="storesPrintHeader" style="display:none;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid #1E3A5F;">
          <div style="font-size:16px;font-weight:700;color:#1E3A5F;">ДДС · Daracom — Магазины Гульжан А.</div>
          <div style="font-size:12px;color:#6B7280;margin-top:3px;">Отчётный период: <span class="ph-month"></span></div>
        </div>
```

- [ ] **Step 2: Обновить JS в renderStoreGrid**

Найти (~1159–1164):
```js
  // Заполняем блок остатков для печати
  const sprintBal   = monthlyBalance ? calcBalance(currentMonth) : null;
  const sprintOpen  = document.getElementById('sprintBalOpen');
  const sprintClose = document.getElementById('sprintBalClose');
  if (sprintOpen  && sprintBal) sprintOpen.textContent  = fmt(sprintBal.balanceStart) + ' ₸';
  if (sprintClose && sprintBal) sprintClose.textContent = fmt(sprintBal.balanceEnd)   + ' ₸';
```
Заменить на:
```js
  // Обновляем месяц в print-шапке
  const storesPH = document.getElementById('storesPrintHeader');
  if (storesPH) {
    const monthSpan = storesPH.querySelector('.ph-month');
    if (monthSpan) monthSpan.textContent = MONTH_NAMES[currentMonth - 1] + ' 2026';
  }
```

- [ ] **Step 3: Проверить в браузере**

Открыть «ДДС Магазины Гульжан А.», выбрать месяц, нажать «Печать».  
В print-preview: шапка «ДДС · Daracom — Магазины Гульжан А. — Отчётный период: Март 2026» (или текущий месяц), без остатков, повторяется на каждой странице.

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(print): replace balance with month in stores print header"
```

---

### Task 9: Push и финальная проверка

- [ ] **Step 1: Полная проверка всех разделов**

Проверить в браузере:
1. **ДДС Гульжан А.** — нет колонки «Общее», нет группы «Прочее», «Ком услуги» имеет метку ▼, «Налоги ИП (квартальные)» не скрывается при «Скрыть нулевые», pending-ячейки показывают ⏳
2. **ДДС Магазины Гульжан А.** — правильное название в nav и заголовке, карточки содержат группу «Аренда и ком. услуги» с заголовком + подстатьи, группу «Налоги» с заголовком + подстатьи
3. **Печать «ДДС Гульжан А.»** — шапка на каждой странице, нет остатков, номер страницы
4. **Печать «Сводная ДДС»** — шапка на каждой странице, нет остатков, номер страницы
5. **Печать «ДДС Магазины Гульжан А.»** — шапка «Магазины Гульжан А.» + месяц на каждой странице, номер страницы

- [ ] **Step 2: Push**

```bash
git push origin main
```
