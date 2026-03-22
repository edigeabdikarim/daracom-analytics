# ДДС Expenses Table Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the expandable-list "По статьям" view in dds.html with a table showing Статья / Направления / Доля / Сумма / %, with a two-block hover tooltip (directions + stores) and fixed article ordering.

**Architecture:** All changes in a single file (`dds.html`). New functions `renderArticlesTable()`, `sortIncomeArticles()`, `getDirectionBreakdown()` replace and extend existing ones. Dead code (`renderExpandableList`, `toggleExpandArticle`, `buildExpandBody`, etc.) is removed cleanly after the new code is wired in.

**Tech Stack:** Vanilla JS, Tailwind CSS (CDN), inline `<style>` block in dds.html. No build tools, no test runner — verification is done by reading the browser at `file://` or GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-03-22-dds-expenses-table-redesign.md`

---

## File Map

| File | Changes |
|------|---------|
| `dds.html:176-182` | Add `INCOME_ARTICLE_PRIORITY` constant in CONFIG block |
| `dds.html:80-170` | CSS: add table styles, update tooltip max-width, remove dead classes |
| `dds.html:665-678` | Add `sortIncomeArticles()` and `getDirectionBreakdown()` after `getIncomeArticles()` |
| `dds.html:738-803` | Replace `toggleExpandArticle()` + `renderExpandableList()` + `setSortArticles()` with `renderArticlesTable()` |
| `dds.html:1111-1136` | Replace `showTooltip()` with two-block version |
| `dds.html:305-309` | Remove `#expSortBtns` HTML block |
| `dds.html:372,378-380` | Remove state vars: `articleSortMode`, `expandedArticles`, `_artItems` |
| `dds.html:973-988,1023-1026` | Update call sites: `renderExpensesSection`, `setExpensesTab`, `_refreshAfterMonthLoad` |
| `dds.html:1029-1108` | Update `renderMatrixTable()`: apply `sortIncomeArticles()` to income articles |

---

## Task 1: Add INCOME_ARTICLE_PRIORITY constant

**Files:**
- Modify: `dds.html:176-182` (CONFIG block)

- [ ] **Step 1: Open `dds.html`, find the CONFIG block** (line 176: `<!-- ═══════════ КОНФИГУРАЦИЯ ═══════════ -->`)

- [ ] **Step 2: Add the constant after `OPENING_BALANCE_2026`**

```js
// Фиксированный порядок статей поступлений (остальные — по убыванию суммы)
const INCOME_ARTICLE_PRIORITY = ['Выручка от продаж', 'Возврат товаров'];
```

Result: CONFIG block now has 4 constants.

- [ ] **Step 3: Commit**

```bash
git add dds.html
git commit -m "feat: add INCOME_ARTICLE_PRIORITY constant"
```

---

## Task 2: Add sortIncomeArticles() and getDirectionBreakdown()

**Files:**
- Modify: `dds.html` — insert after `getStoreBreakdown()` (line ~678)

- [ ] **Step 1: Find `getStoreBreakdown()` function end** (~line 678, the closing `}`)

- [ ] **Step 2: Insert two new functions immediately after it**

```js
// Сортировка статей поступлений: приоритетные — первыми, остальные — по убыванию суммы
function sortIncomeArticles(articles) {
  const priority = INCOME_ARTICLE_PRIORITY;
  return [
    ...priority
      .map(name => articles.find(([n]) => n.trim() === name.trim()))
      .filter(Boolean),
    ...articles
      .filter(([n]) => !priority.includes(n.trim()))
      .sort((a, b) => b[1] - a[1])
  ];
}

// Суммы по направлениям для конкретной статьи (аналог getStoreBreakdown)
function getDirectionBreakdown(rows, articleName, type) {
  const map = {};
  rows.forEach(r => {
    if (r.activity === 'Техническая операция') return;
    if (type === 'income' && r.type !== 'Поступление') return;
    if (type === 'expense' && (r.type !== 'Выбытие' || r.activity !== 'Операционная' || r.direction === 'Операция')) return;
    if (r.article !== articleName) return;
    const d = r.direction || 'Прочее';
    map[d] = (map[d] || 0) + Math.abs(r.amount);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}
```

- [ ] **Step 3: Verify** — open browser console, load dds.html, run:
```js
sortIncomeArticles([['Возврат товаров', 100], ['Выручка от продаж', 500], ['Кредит', 200]])
// Expected: [['Выручка от продаж', 500], ['Возврат товаров', 100], ['Кредит', 200]]
```

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat: add sortIncomeArticles and getDirectionBreakdown"
```

---

## Task 3: Add CSS for articles table, update tooltip, remove dead CSS

**Files:**
- Modify: `dds.html:80-170` (inline `<style>` block)

- [ ] **Step 1: Add new CSS classes for the articles table** — insert in `<style>` block, after the existing `.article-group-hdr` block (~line 141):

```css
/* ─── Articles table (replaces expandable list) ─── */
.art-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.art-tbl thead tr { background: #F9FAFB; }
.art-tbl th { padding: 8px 14px; text-align: left; font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .05em; border-bottom: 2px solid #E5E7EB; }
.art-tbl th.r { text-align: right; }
.art-tbl td { padding: 10px 14px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
.art-tbl tr.art-row:hover td { background: #F3F4FF; cursor: default; }
.art-tbl tr:last-child td { border-bottom: none; }
.art-tbl-grp td { padding: 6px 14px; }
.art-tbl-grp.income td { background: #F0FDF4; }
.art-tbl-grp.expense td { background: #FEF2F2; }
.art-tbl-grp-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
.art-tbl-grp.income .art-tbl-grp-label { color: #059669; }
.art-tbl-grp.expense .art-tbl-grp-label { color: #B91C1C; }
.art-tbl-grp-total { font-size: 12px; font-weight: 700; margin-left: 10px; }
.art-tbl-grp.income .art-tbl-grp-total { color: #059669; }
.art-tbl-grp.expense .art-tbl-grp-total { color: #B91C1C; }
.art-tbl-name { font-size: 13px; font-weight: 500; color: #374151; }
.art-tbl-dirs { display: flex; gap: 4px; flex-wrap: wrap; }
.art-tbl-dir { font-size: 10px; color: #4B5563; background: #F3F4F6; border-radius: 4px; padding: 2px 6px; white-space: nowrap; }
.art-tbl-bar-cell { width: 110px; }
.art-tbl-bar-bg { height: 6px; background: #F3F4F6; border-radius: 3px; }
.art-tbl-bar-e { height: 6px; border-radius: 3px; background: linear-gradient(90deg, #EF4444, #F97316); }
.art-tbl-bar-i { height: 6px; border-radius: 3px; background: linear-gradient(90deg, #10B981, #34D399); }
.art-tbl-amt-e { font-size: 13px; font-weight: 700; color: #EF4444; text-align: right; white-space: nowrap; }
.art-tbl-amt-i { font-size: 13px; font-weight: 700; color: #10B981; text-align: right; white-space: nowrap; }
.art-tbl-pct { text-align: right; white-space: nowrap; }
.art-tbl-pct-main { font-size: 12px; font-weight: 700; color: #374151; display: block; }
.art-tbl-pct-main.income { color: #10B981; }
.art-tbl-pct-sub { font-size: 10px; color: #9CA3AF; display: block; margin-top: 1px; }
.art-tbl-pct-sub span { color: #6B7280; font-weight: 600; }
```

- [ ] **Step 2: Update tooltip CSS** — change `max-width: 290px` → `max-width: 260px` in `.art-tooltip` and add bar styles:

```css
.art-tooltip { ... max-width: 260px; }
.art-tooltip-bar-wrap { width: 44px; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; flex-shrink: 0; }
.art-tooltip-bar-fill { height: 3px; border-radius: 2px; }
.art-tooltip-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 9px 0; }
```

- [ ] **Step 3: Remove dead CSS classes** — delete these blocks from `<style>`:
  - `.article-item`, `.article-item:hover`, `.article-item:last-child` (lines ~81-83)
  - `.article-name`, `.article-pct`, `.article-amount`, `.article-bar-wrap`, `.article-bar` (lines ~84-88)
  - `.article-group-hdr`, `.article-group-hdr.income`, `.article-group-hdr.expense` (lines ~139-141)
  - `.expand-chevron`, `.article-item.is-expanded .expand-chevron` (lines ~142-143)
  - `.article-expand-body`, `.article-expand-body.open` (lines ~144-145)
  - `.mini-bars`, `.mini-bar-col`, `.mini-bar-fill`, `.mini-bar-lbl`, `.mini-bar-val` (lines ~148-152)

- [ ] **Step 4: Verify** — `dds.html` still opens without CSS errors, no visual breakage in other sections (KPI, По магазинам, По дням)

- [ ] **Step 5: Commit**

```bash
git add dds.html
git commit -m "feat: add articles table CSS, remove dead expand-list styles"
```

---

## Task 4: Write renderArticlesTable()

**Files:**
- Modify: `dds.html` — replace `renderExpandableList()` body (line 749)

- [ ] **Step 1: Replace the entire `renderExpandableList()` function** with `renderArticlesTable()`. Keep function at same location in file.

```js
function renderArticlesTable() {
  const incomeArticles = sortIncomeArticles(getIncomeArticles(filteredRows));
  const expenseArticles = getArticlesData(filteredRows); // уже отсортированы по сумме
  const incomeTotal = incomeArticles.reduce((s, [,a]) => s + a, 0);
  const expenseTotal = expenseArticles.reduce((s, [,a]) => s + a, 0);

  const container = document.getElementById('articlesList');
  if (!incomeArticles.length && !expenseArticles.length) {
    container.innerHTML = '<p class="text-gray-400 text-sm p-4">Нет данных</p>';
    return;
  }

  const renderRow = (name, amount, groupTotal, incomeTotal, type) => {
    const barPct = groupTotal > 0 ? Math.min(Math.round(amount / groupTotal * 100), 100) : 0;
    const pctOfGroup = groupTotal > 0 ? (amount / groupTotal * 100).toFixed(1) : '0';
    const pctOfIncome = incomeTotal > 0 ? (amount / incomeTotal * 100).toFixed(1) : '0';

    // Направления для тэгов — уникальные значения из строк
    const dirSet = new Set();
    filteredRows.forEach(r => {
      if (r.activity === 'Техническая операция') return;
      if (type === 'income' && r.type !== 'Поступление') return;
      if (type === 'expense' && (r.type !== 'Выбытие' || r.activity !== 'Операционная' || r.direction === 'Операция')) return;
      if (r.article !== name) return;
      if (r.direction) dirSet.add(r.direction);
    });
    const dirTags = [...dirSet].map(d => `<span class="art-tbl-dir">${escHtml(d)}</span>`).join('');

    if (type === 'income') {
      return `<tr class="art-row"
          data-name="${escAttr(name)}" data-type="income"
          onmouseenter="showTooltip(event)" onmouseleave="hideTooltip()">
        <td class="art-tbl-name">${escHtml(name)}</td>
        <td><div class="art-tbl-dirs">${dirTags}</div></td>
        <td class="art-tbl-bar-cell"><div class="art-tbl-bar-bg"><div class="art-tbl-bar-i" style="width:${barPct}%"></div></div></td>
        <td class="art-tbl-amt-i">${fmt(amount)}</td>
        <td class="art-tbl-pct">
          <span class="art-tbl-pct-main income">${pctOfGroup}%</span>
          <span class="art-tbl-pct-sub">от итого</span>
        </td>
      </tr>`;
    } else {
      return `<tr class="art-row"
          data-name="${escAttr(name)}" data-type="expense"
          onmouseenter="showTooltip(event)" onmouseleave="hideTooltip()">
        <td class="art-tbl-name">${escHtml(name)}</td>
        <td><div class="art-tbl-dirs">${dirTags}</div></td>
        <td class="art-tbl-bar-cell"><div class="art-tbl-bar-bg"><div class="art-tbl-bar-e" style="width:${barPct}%"></div></div></td>
        <td class="art-tbl-amt-e">${fmt(amount)}</td>
        <td class="art-tbl-pct">
          <span class="art-tbl-pct-main">${pctOfGroup}%</span>
          <span class="art-tbl-pct-sub">от выр: <span>${pctOfIncome}%</span></span>
        </td>
      </tr>`;
    }
  };

  const incomeRows = incomeArticles.map(([name, amount]) =>
    renderRow(name, amount, incomeTotal, incomeTotal, 'income')).join('');
  const expenseRows = expenseArticles.map(([name, amount]) =>
    renderRow(name, amount, expenseTotal, incomeTotal, 'expense')).join('');

  container.innerHTML = `
    <table class="art-tbl">
      <thead><tr>
        <th>Статья</th>
        <th>Направления</th>
        <th class="r" style="width:110px">Доля</th>
        <th class="r">Сумма, ₸</th>
        <th class="r" style="width:85px">%</th>
      </tr></thead>
      <tbody>
        ${incomeArticles.length ? `
          <tr class="art-tbl-grp income">
            <td colspan="5">
              <span class="art-tbl-grp-label">💰 Поступления</span>
              <span class="art-tbl-grp-total">${fmt(incomeTotal)}</span>
            </td>
          </tr>
          ${incomeRows}
        ` : ''}
        ${expenseArticles.length ? `
          <tr class="art-tbl-grp expense">
            <td colspan="5">
              <span class="art-tbl-grp-label">💸 Расходы операционные</span>
              <span class="art-tbl-grp-total">${fmt(expenseTotal)}</span>
            </td>
          </tr>
          ${expenseRows}
        ` : ''}
      </tbody>
    </table>`;
}
```

- [ ] **Step 2: Verify** — open dds.html, go to «Куда ушли деньги» → «По статьям». Table renders. Поступления first, then Расходы. «Выручка от продаж» is first row in income group.

- [ ] **Step 3: Commit**

```bash
git add dds.html
git commit -m "feat: add renderArticlesTable replacing expandable list"
```

---

## Task 5: Update showTooltip() for two-block design

**Files:**
- Modify: `dds.html:1111-1136` (`showTooltip()`)

- [ ] **Step 1: Replace `showTooltip(e, idx)` with new version**

```js
function showTooltip(e) {
  const row = e.currentTarget;
  const name = row.dataset.name;
  const type = row.dataset.type;
  if (!name) return;

  const directions = getDirectionBreakdown(filteredRows, name, type);
  const stores = getStoreBreakdown(filteredRows, name, type);
  if (!directions.length && !stores.length) return;

  const colorExp = '#F87171', colorInc = '#34D399';
  const color = type === 'income' ? colorInc : colorExp;

  const renderBlock = (title, items) => {
    if (!items.length) return '';
    const maxAmt = items[0][1]; // отсортированы по убыванию
    const rows = items.map(([label, amt]) => {
      const barW = maxAmt > 0 ? Math.round(amt / maxAmt * 44) : 0;
      return `<div class="art-tooltip-row">
        <div class="art-tooltip-store">${escHtml(label)}</div>
        <div class="art-tooltip-bar-wrap"><div class="art-tooltip-bar-fill" style="width:${barW}px;background:${color}"></div></div>
        <div class="art-tooltip-amt" style="color:${color}">${fmt(amt)}</div>
      </div>`;
    }).join('');
    return `<div class="art-tooltip-title">${title}</div>${rows}`;
  };

  const dirBlock = renderBlock('По направлениям', directions);
  const storeBlock = renderBlock('По магазинам', stores);
  const divider = (dirBlock && storeBlock) ? '<hr class="art-tooltip-divider">' : '';

  const tip = document.getElementById('articleTooltip');
  tip.innerHTML = dirBlock + divider + storeBlock;

  const tw = 260, th = tip.scrollHeight || 200;
  let x = e.clientX + 14, y = e.clientY + 10;
  if (x + tw > window.innerWidth - 10) x = e.clientX - tw - 14;
  if (y + th > window.innerHeight - 10) y = e.clientY - th - 10;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
  tip.style.display = 'block';
}
```

- [ ] **Step 2: Verify** — hover over a row in «По статьям». Tooltip shows two sections: По направлениям (with mini-bars) and По магазинам (with mini-bars). Moving mouse hides tooltip.

- [ ] **Step 3: Commit**

```bash
git add dds.html
git commit -m "feat: update showTooltip with two-block directions + stores"
```

---

## Task 6: Remove sort buttons from HTML + update setExpensesTab()

**Files:**
- Modify: `dds.html:305-309` (HTML)
- Modify: `dds.html:979-988` (`setExpensesTab()`)
- Modify: `dds.html:973-976` (`renderExpensesSection()`)
- Modify: `dds.html:1023-1026` (`_refreshAfterMonthLoad()`)

- [ ] **Step 1: Remove `#expSortBtns` div from HTML** (lines 305-308):

Delete:
```html
<div id="expSortBtns" class="flex gap-1">
  <button class="sort-btn active" id="sortByAmount" onclick="setSortArticles('amount')">По сумме</button>
  <button class="sort-btn" id="sortByAlpha" onclick="setSortArticles('alpha')">По алфавиту</button>
</div>
```

- [ ] **Step 2: Update `setExpensesTab()`** — remove the `expSortBtns` line and replace `renderExpandableList()` with `renderArticlesTable()`:

```js
function setExpensesTab(tab) {
  expensesTab = tab;
  document.getElementById('expTabList').classList.toggle('active', tab === 'list');
  document.getElementById('expTabTable').classList.toggle('active', tab === 'table');
  document.getElementById('expSubList').style.display = tab === 'list' ? '' : 'none';
  document.getElementById('expSubTable').style.display = tab === 'table' ? '' : 'none';
  if (tab === 'table') { loadAllMonths(); renderMatrixTable(); }
  else renderArticlesTable();
}
```

- [ ] **Step 3: Update `renderExpensesSection()`**:

```js
function renderExpensesSection() {
  if (expensesTab === 'list') renderArticlesTable();
  else renderMatrixTable();
}
```

- [ ] **Step 4: Update `_refreshAfterMonthLoad()`** — remove `expandedArticles` check:

```js
function _refreshAfterMonthLoad() {
  if (expensesTab === 'table') { renderMatrixTable(); return; }
  renderArticlesTable();
}
```

- [ ] **Step 5: Verify** — switching between «По статьям» and «Таблица» tabs works. Sort buttons are gone. «По статьям» shows table. «Таблица» shows monthly matrix.

- [ ] **Step 6: Commit**

```bash
git add dds.html
git commit -m "feat: remove sort buttons, update tab switching and refresh callbacks"
```

---

## Task 7: Remove dead JS code

**Files:**
- Modify: `dds.html:368-380` (STATE block)
- Modify: `dds.html:738-803` (remove dead functions)

- [ ] **Step 1: Remove dead state variables** from the STATE block (~lines 372, 378-380):

Delete these lines:
```js
let articleSortMode = 'amount';
let expandedArticles = {}; // { 'income::name' | 'expense::name': true }
let _artItems = [];        // [{keyStr, name, type}] — порядок статей в текущем рендере
```

- [ ] **Step 2: Delete dead functions** — remove entirely from JS:
  - `toggleExpandArticle()` (lines ~738-747)
  - `setSortArticles()` (lines ~798-803)
  - `buildExpandBody()` (lines ~680-748)

- [ ] **Step 3: Verify** — open browser console, no `ReferenceError`. Load dds.html, switch to «Куда ушли», table renders correctly.

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "chore: remove dead expandable list code (expandedArticles, toggleExpand, buildExpandBody)"
```

---

## Task 8: Update renderMatrixTable() with sortIncomeArticles()

**Files:**
- Modify: `dds.html:1056` (`renderMatrixTable()`)

- [ ] **Step 1: Find line in `renderMatrixTable()`** where `incomeArticles` is built:

```js
const incomeArticles = Object.entries(incomeMap).sort((a, b) => b[1].total - a[1].total);
```

- [ ] **Step 2: Replace that line** to apply priority sort:

```js
const incomeArticles = sortIncomeArticles(
  Object.entries(incomeMap).map(([name, data]) => [name, data.total])
).map(([name]) => [name, incomeMap[name]]);
```

- [ ] **Step 3: Verify** — go to «По статьям» → «Таблица». In the Поступления group, «Выручка от продаж» is the first row, «Возврат товаров» is second.

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat: apply INCOME_ARTICLE_PRIORITY sort to matrix table income rows"
```

---

## Task 9: Final check and push

- [ ] **Step 1: Full visual check** — open dds.html in browser:
  1. «По статьям» → table visible, Поступления first
  2. «Выручка от продаж» row 1, «Возврат товаров» row 2 in income group
  3. Hover on any row → tooltip with «По направлениям» block + «По магазинам» block, both with mini-bars
  4. Switch to «Таблица» → matrix renders, income rows start with «Выручка от продаж»
  5. Switch month → data refreshes correctly
  6. Activate store filter → ⚠ appears on KPI balance cards
  7. No console errors

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

GitHub Pages auto-deploys to `https://edigeabdikarim.github.io/daracom-analytics/dds.html`
