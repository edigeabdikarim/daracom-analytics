# Store Cards Group Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace direction-based breakdown in store cards with article-group breakdown, rename income line to «Продажи», and move «Услуги банка» articles into «Налоги» group in «Сводная».

**Architecture:** All changes are in `dds.html` only. A new module-level lookup `ARTICLE_GROUP` maps article names → group names (built from the existing `DDS_ARTICLES_ORDER` array). `renderStoreGrid()` uses this lookup for aggregation and rendering. No GAS changes.

**Tech Stack:** Vanilla JS inside a single HTML file. No build step, no test framework — verification is manual in the browser.

---

## File Map

| File | Changes |
|------|---------|
| `dds.html` | (1) Move 2 articles in `DDS_ARTICLES_ORDER`; (2) Add `ARTICLE_GROUP` constant; (3) Replace `renderStoreGrid()` |

---

### Task 1: DDS_ARTICLES_ORDER + ARTICLE_GROUP constant

**Files:**
- Modify: `dds.html` — lines around 1119–1120 (Услуги банка entries) and line 1143 (after DDS_ARTICLES_ORDER closing bracket)

- [ ] **Step 1: Move «Услуги банка» articles to group «Налоги»**

Find these two lines (currently in the `// ── IT и офис ──` block, around line 1119):

```javascript
  { article: 'Услуги банка',                                 group: 'IT и офис',                 isIncome: false },
  { article: 'Услуги банка Kaspi',                           group: 'IT и офис',                 isIncome: false },
```

Change `group` to `'Налоги'` on both lines:

```javascript
  { article: 'Услуги банка',                                 group: 'Налоги',                    isIncome: false },
  { article: 'Услуги банка Kaspi',                           group: 'Налоги',                    isIncome: false },
```

- [ ] **Step 2: Add ARTICLE_GROUP lookup after DDS_ARTICLES_ORDER**

After the closing `];` of `DDS_ARTICLES_ORDER` (line 1143), add:

```javascript
// Lookup: article name → group name (built from DDS_ARTICLES_ORDER)
const ARTICLE_GROUP = {};
DDS_ARTICLES_ORDER.forEach(a => { ARTICLE_GROUP[a.article] = a.group; });
```

- [ ] **Step 3: Verify in browser — «Сводная»**

Open `dds.html` in a browser (load data for any month). Navigate to «Сводная».

Check:
- «Услуги банка» and «Услуги банка Kaspi» rows appear under the **«Налоги»** group header, not under «IT и офис»
- «IT и офис» group total decreased; «Налоги» group total increased accordingly
- No JS errors in the browser console

- [ ] **Step 4: Commit**

```bash
git add dds.html
git commit -m "feat(dds/stores): move Услуги банка to Налоги group, add ARTICLE_GROUP lookup"
```

---

### Task 2: Replace renderStoreGrid()

**Files:**
- Modify: `dds.html` — `renderStoreGrid()` function (lines 841–914)

- [ ] **Step 1: Replace the entire renderStoreGrid() function**

Find the function (starts at `function renderStoreGrid() {`, ends at the closing `}` after `}).join('');`).

Replace the entire function body with:

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

  const stores = Object.entries(storeMap).sort((a, b) => (b[1].inc + b[1].out) - (a[1].inc + a[1].out));
  const grid = document.getElementById('storeGrid');
  if (stores.length === 0) { grid.innerHTML = '<p class="text-gray-400 text-sm">Нет данных</p>'; return; }

  grid.innerHTML = stores.map(([name, d]) => {
    const salesTotal = d.salesInc - d.salesOut;
    const cf = d.inc - d.out;
    const cfColor = cf >= 0 ? '#10B981' : '#EF4444';

    // % затрат (выбытия / продажи)
    const pct = salesTotal > 0 ? d.out / salesTotal * 100 : 0;
    const pctColor = pct < 80 ? '#059669' : pct < 100 ? '#D97706' : '#DC2626';
    const pctBg   = pct < 80 ? '#D1FAE5' : pct < 100 ? '#FEF3C7' : '#FEE2E2';
    const barFill = Math.min(pct, 100).toFixed(1);

    // Разбивка выбытий по группам статей
    const groups = Object.entries(d.groups)
      .sort((a, b) => b[1] - a[1]);

    const groupRows = groups.map(([grpName, amt]) => {
      const gp = salesTotal > 0 ? (amt / salesTotal * 100).toFixed(0) : '0';
      const bw = d.out > 0 ? Math.min(Math.round(amt / d.out * 100), 100) : 0;
      return `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;font-size:11px;">
        <span style="flex:1;color:#6B7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(grpName)}</span>
        <div style="width:32px;height:3px;background:#F3F4F6;border-radius:2px;flex-shrink:0;"><div style="height:3px;border-radius:2px;background:#EF4444;width:${bw}%"></div></div>
        <span style="color:#EF4444;font-weight:600;white-space:nowrap;">${fmtShort(amt)}</span>
        <span style="color:#6B7280;font-weight:700;white-space:nowrap;min-width:28px;text-align:right;">${gp}%</span>
      </div>`;
    }).join('');

    return `<div class="store-card" data-store="${escHtml(name)}" onclick="openDrillStore(this.dataset.store)">
      <div class="store-name">${escHtml(shortStoreName(name))}</div>
      <div class="store-row"><span class="store-row-label">Продажи</span><span class="store-row-val" style="color:#10B981">${fmt(salesTotal)}</span></div>
      <div class="store-row"><span class="store-row-label">Выбытия</span><span class="store-row-val" style="color:#EF4444">${fmt(d.out)}</span></div>
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
          ${groupRows}
        ` : ''}
      </div>
      ` : ''}
    </div>`;
  }).join('');
}
```

- [ ] **Step 2: Verify in browser — «По магазинам»**

Open `dds.html`, navigate to «По магазинам». For each store card check:

1. **Income label** reads «Продажи» (not «Поступления»)
2. **Продажи value** = net sales (should be less than or equal to the old «Поступления» value by the amount of returns; for a store with no returns it will be the same)
3. **Чистый CF** is unchanged (still `total inc − total out`)
4. **«Затраты от продаж»** label appears (not «Затраты от поступлений»)
5. **%** in the chip reflects `Выбытия / Продажи` — if Продажи < old Поступления, the % will be higher than before
6. **Breakdown section** is titled «Выбытия по группам»
7. **Group names** visible (e.g. «Прямые расходы», «Аренда и ком. услуги», «Зарплаты», etc.) — not direction names
8. **Groups «Платежи», «Основные средства», «Финансирование»** do NOT appear in the breakdown
9. **% on each row** is gray (`#6B7280`) — no green/yellow/red coloring
10. **No legend** (🟢🟡🔴 line is gone)
11. No JS errors in console

- [ ] **Step 3: Commit**

```bash
git add dds.html
git commit -m "feat(dds/stores): replace direction breakdown with article-group breakdown, rename Поступления to Продажи"
```

---

### Task 3: Deploy

- [ ] **Step 1: Push to GitHub Pages**

```bash
git push
```

- [ ] **Step 2: Verify on GitHub Pages**

Wait ~1 minute, open the GitHub Pages URL, navigate to «По магазинам» and «Сводная», repeat the checks from Tasks 1 and 2.
