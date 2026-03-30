# ДДС Гульжан А. — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить раздел «ДДС Гульжан А.» в `dds.html` — дубликат Сводной с учётом реального периода расходов: аренда показывает данные M-1, зарплаты/Налоги ЗП — данные M+1, остальные статьи — данные M.

**Architecture:** Все изменения только в `dds.html`. Новая функция `buildGulzhanData(month)` собирает строки из трёх месяцев и передаёт в существующую `buildSummaryData()`. Функция `ensureMonthLoaded(m)` выделяется из `loadAllMonths()` для загрузки произвольных месяцев. `renderGulzhanMatrix()` — рендер матрицы с цветовой маркировкой сдвинутых статей.

**Tech Stack:** Vanilla JS, HTML, CSS — без сборки, изменяется один файл.

---

## Файлы

- **Modify:** `dds.html` (единственный файл, все 7 задач)

---

### Task 1: CSS-стили для цветовой маркировки статей

**Files:**
- Modify: `dds.html:227` (после последней строки блока `@media print` → перед закрывающим `</style>`)

- [ ] **Step 1: Найти точку вставки**

  В `dds.html` найди строку ~228, где заканчивается блок `@media print` и перед `</style>`. Вставь стили после строки с `}` закрывающей media-блок.

- [ ] **Step 2: Добавить CSS**

  После строки 227 (`.summary-tbl th, .summary-tbl td { position: static !important; }` внутри print-блока) вставь перед закрывающим `</style>`:

  ```css
    /* ── ДДС Гульжан А. — цветовая маркировка статей ── */
    .gul-advance    { background: #FEF3C7 !important; color: #92400E !important; }
    .gul-prevmonth  { background: #EDE9FE !important; color: #5B21B6 !important; }
    .gul-shift-label { display: block; font-size: 10px; font-weight: 400; margin-top: 2px; opacity: 0.75; }
    @media print {
      .gul-advance   { background: #FEF3C7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .gul-prevmonth { background: #EDE9FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  ```

- [ ] **Step 3: Быстрая проверка**

  Открой `dds.html` в браузере (или перезагрузи). Нет ошибок в консоли → CSS принят. Классы пока не используются, но они определены.

- [ ] **Step 4: Commit**

  ```bash
  git add dds.html
  git commit -m "style(gulzhan): add gul-advance and gul-prevmonth CSS classes"
  ```

---

### Task 2: JS-константы для логики сдвига

**Files:**
- Modify: `dds.html:1226` (после блока `COMPANY_WIDE_ARTICLES`)

- [ ] **Step 1: Найти точку вставки**

  Найди строку ~1226 — конец блока `COMPANY_WIDE_ARTICLES`:
  ```js
  const COMPANY_WIDE_ARTICLES = new Set([
    ...
    'Выдача кредитов и займов',
  ]);
  ```
  Вставь после закрывающей `});`.

- [ ] **Step 2: Добавить константы**

  ```js
  // ─── ДДС ГУЛЬЖАН А. — КОНСТАНТЫ ──────────────────────

  // Захардкоженные данные декабря 2025 (аренда за январь 2026)
  const GULZHAN_DEC2025_RENT = {
    'Аренда торговых точек': {
      'Магазин Астана':       -9036386,
      'Магазин Above Астана': -3749774,
      'Магазин Мира':         -2500000,
      'Магазин Есентай':      -3625000,
      'Магазин Above':        0,
      'Магазин Восход':       -2139750,
    },
    'Аренда офиса':           {},
    'Аренда и Охрана Склада': {},
  };

  // Оплачиваются наперёд (платёж в M идёт за M+1 → для периода M берём данные из M-1)
  const GULZHAN_ADVANCE_ARTICLES = new Set([
    'Аренда торговых точек',
    'Аренда офиса',
    'Аренда и Охрана Склада',
  ]);

  // Оплачиваются за предыдущий месяц (платёж в M идёт за M-1 → для периода M берём данные из M+1)
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

- [ ] **Step 3: Проверка в консоли**

  Открой консоль браузера (F12), введи:
  ```js
  console.log([...GULZHAN_ADVANCE_ARTICLES]);
  console.log([...GULZHAN_PREV_MONTH_ARTICLES]);
  console.log(GULZHAN_DEC2025_RENT['Аренда торговых точек']['Магазин Астана']); // → -9036386
  ```
  Все три команды должны вернуть ожидаемые значения без ошибок.

- [ ] **Step 4: Commit**

  ```bash
  git add dds.html
  git commit -m "feat(gulzhan): add GULZHAN constants — advance/prevmonth article sets and Dec2025 rent"
  ```

---

### Task 3: Утилита `ensureMonthLoaded(m)`

**Files:**
- Modify: `dds.html:1090` (функция `loadAllMonths`)

- [ ] **Step 1: Заменить `loadAllMonths` на утилиту + обёртку**

  Найди функцию `loadAllMonths()` (строки ~1090–1120). Замени её целиком:

  ```js
  // Загружает один конкретный месяц (если ещё не загружен)
  function ensureMonthLoaded(m) {
    if (m < 1 || m > 12) return;
    if (allMonthsLoaded[m] === 'done' || allMonthsLoaded[m] === 'loading') return;
    allMonthsLoaded[m] = 'loading';
    const cacheKey = 'dds_cache_month_' + m;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS) {
          allMonthsData[m] = data.rows || [];
          allMonthsLoaded[m] = 'done';
          _refreshAfterMonthLoad();
          return;
        }
      }
    } catch(e) {}
    (function(month) {
      fetch(DDS_GAS_URL + '?action=dds&month=' + month)
        .then(r => r.json())
        .then(resp => {
          if (!resp.ok) throw new Error();
          allMonthsData[month] = resp.data.rows || [];
          allMonthsLoaded[month] = 'done';
          localStorage.setItem('dds_cache_month_' + month, JSON.stringify({ ts: Date.now(), data: resp.data }));
          _refreshAfterMonthLoad();
        })
        .catch(() => { allMonthsLoaded[month] = 'error'; });
    })(m);
  }

  function loadAllMonths() {
    for (let m = 1; m <= currentMonth; m++) {
      ensureMonthLoaded(m);
    }
  }
  ```

- [ ] **Step 2: Проверить что матрица «Таблица» не сломалась**

  В браузере: открой раздел «Куда ушли» → подтаб «Таблица». Данные должны загрузиться как раньше. Проверь в консоли — нет ошибок.

- [ ] **Step 3: Commit**

  ```bash
  git add dds.html
  git commit -m "refactor(dds): extract ensureMonthLoaded() utility from loadAllMonths()"
  ```

---

### Task 4: HTML — навигация и секция

**Files:**
- Modify: `dds.html:303` (nav) и `dds.html:422` (section)

- [ ] **Step 1: Добавить nav-item после `nav-summary`**

  Найди блок (строки ~303–305):
  ```html
        <div class="nav-item" onclick="setSection('summary')" id="nav-summary">
          <span class="nav-icon">📋</span> Сводная
        </div>
  ```
  Вставь сразу после него:
  ```html
        <div class="nav-item" onclick="setSection('gulzhan')" id="nav-gulzhan">
          <span class="nav-icon">👩‍💼</span> ДДС Гульжан А.
        </div>
  ```

- [ ] **Step 2: Добавить HTML-секцию после `section-summary`**

  Найди строку ~422 — конец `</div>` закрывающий `section-summary`, перед `<!-- ── РАЗДЕЛ 4: ПО МАГАЗИНАМ ──`. Вставь новую секцию:

  ```html
        <!-- ── РАЗДЕЛ: ДДС ГУЛЬЖАН А. ── -->
        <div class="section" id="section-gulzhan">
          <div id="gulzhanPrintHeader" style="display:none;padding-bottom:14px;border-bottom:2px solid #1E3A5F;margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-size:17px;font-weight:700;color:#1E3A5F">ДДС · Daracom — Гульжан А. (с учётом периода)</div>
                <div style="font-size:12px;color:#6B7280;margin-top:3px">Отчётный период: <span class="ph-month"></span></div>
              </div>
              <div style="display:flex;gap:16px" id="gulzhanPrintBalances"></div>
            </div>
          </div>
          <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <h2 class="section-title" style="margin-bottom:0">ДДС Гульжан А.</h2>
              <div style="display:flex;gap:8px" id="gulzhanBalanceChips"></div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#6B7280;cursor:pointer;">
                <input type="checkbox" id="gulzhanHideZeros" checked onchange="toggleGulzhanZeros()" style="accent-color:#10B981;">
                Скрыть нулевые
              </label>
              <button class="print-btn" onclick="window.print()">🖨️ Печать</button>
            </div>
          </div>
          <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 10px;border-radius:6px;background:#FEF3C7;color:#92400E;font-weight:600;">
              ▲ Оплата наперёд — данные предыдущего месяца
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 10px;border-radius:6px;background:#EDE9FE;color:#5B21B6;font-weight:600;">
              ▼ Оплата за пред. месяц — данные следующего месяца
            </div>
          </div>
          <div style="background:#fff;border:1px solid #E5E7EB;border-radius:12px;overflow-x:auto;" id="gulzhanWrap">
            <p style="padding:24px;color:#9CA3AF;text-align:center;">Выберите месяц для загрузки данных</p>
          </div>
        </div>
  ```

- [ ] **Step 3: Проверить навигацию**

  Перезагрузи браузер. В сайдбаре должен появиться таб «👩‍💼 ДДС Гульжан А.». Клик по нему → переключается на пустую секцию с легендой. Нет ошибок в консоли.

- [ ] **Step 4: Commit**

  ```bash
  git add dds.html
  git commit -m "feat(gulzhan): add nav tab and section HTML"
  ```

---

### Task 5: Логика `buildGulzhanData()` и `renderGulzhanMatrix()`

**Files:**
- Modify: `dds.html` — добавить после функции `renderSummaryMatrix()` (строка ~1451)

- [ ] **Step 1: Добавить `buildGulzhanData(month)` после блока `toggleSummaryZeros`**

  Найди функцию `toggleSummaryZeros()` (~строка 1453). После её закрывающей `}` добавь:

  ```js
  // ─── ДДС ГУЛЬЖАН А. — ЛОГИКА ДАННЫХ ──────────────────

  // Возвращает строки для статьи с учётом сдвига месяца
  // advance → берём из month-1 (или из GULZHAN_DEC2025_RENT для января)
  // prevmonth → берём из month+1 (или пусто, если нет данных)
  // остальные → из allMonthsData[month]
  function buildGulzhanData(month) {
    const filterRow = r => {
      if (r.activity === 'Техническая операция') return false;
      if (r.direction === 'Операция') return false;
      return true;
    };

    // Текущий месяц — без advance и prevmonth статей
    const rowsCurrent = (allMonthsData[month] || []).filter(r => {
      if (!filterRow(r)) return false;
      const art = r.article && r.article.trim() ? r.article.trim() : 'Прочее';
      return !GULZHAN_ADVANCE_ARTICLES.has(art) && !GULZHAN_PREV_MONTH_ARTICLES.has(art);
    });

    // Advance-статьи: из M-1 или из константы декабря для января
    let rowsAdvance = [];
    if (month === 1) {
      // Синтетические строки из GULZHAN_DEC2025_RENT
      Object.entries(GULZHAN_DEC2025_RENT).forEach(([article, storeMap]) => {
        Object.entries(storeMap).forEach(([store, amount]) => {
          if (amount !== 0) {
            rowsAdvance.push({
              article, store, amount,
              activity: 'Операционная', direction: 'Адм. расходы',
              type: amount > 0 ? 'Поступление' : 'Выбытие',
            });
          }
        });
      });
    } else {
      rowsAdvance = (allMonthsData[month - 1] || []).filter(r => {
        if (!filterRow(r)) return false;
        const art = r.article && r.article.trim() ? r.article.trim() : 'Прочее';
        return GULZHAN_ADVANCE_ARTICLES.has(art);
      });
    }

    // PrevMonth-статьи: из M+1 (если загружены)
    const rowsPrevMonth = (allMonthsData[month + 1] || []).filter(r => {
      if (!filterRow(r)) return false;
      const art = r.article && r.article.trim() ? r.article.trim() : 'Прочее';
      return GULZHAN_PREV_MONTH_ARTICLES.has(art);
    });

    return buildSummaryData([...rowsCurrent, ...rowsAdvance, ...rowsPrevMonth]);
  }
  ```

- [ ] **Step 2: Добавить `renderGulzhanMatrix()` сразу после**

  ```js
  function renderGulzhanMatrix() {
    const wrap = document.getElementById('gulzhanWrap');
    if (!wrap) return;
    if (document.getElementById('stateContent').classList.contains('hidden')) return;
    if (!allRows || allRows.length === 0) {
      wrap.innerHTML = `<p style="padding:24px;color:#9CA3AF;text-align:center;">Нет данных за ${escHtml(MONTH_NAMES[currentMonth - 1])}</p>`;
      return;
    }

    // Запускаем загрузку смежных месяцев (не блокируем рендер)
    ensureMonthLoaded(currentMonth - 1);
    ensureMonthLoaded(currentMonth + 1);

    const { stores, groups, totalIncome } = buildGulzhanData(currentMonth);
    if (stores.length === 0) {
      wrap.innerHTML = `<p style="padding:24px;color:#9CA3AF;text-align:center;">Нет данных по магазинам за ${escHtml(MONTH_NAMES[currentMonth - 1])}</p>`;
      return;
    }

    const hideZeros = document.getElementById('gulzhanHideZeros') && document.getElementById('gulzhanHideZeros').checked;
    const prevMonthName  = currentMonth > 1 ? MONTH_NAMES[currentMonth - 2] : 'дек. 2025';
    const nextMonthName  = currentMonth < 12 ? MONTH_NAMES[currentMonth] : '—';
    const prevLoading    = currentMonth > 1 && allMonthsLoaded[currentMonth - 1] !== 'done';
    const nextLoading    = currentMonth < 12 && allMonthsLoaded[currentMonth + 1] === 'loading';

    // Печатный заголовок
    const ph = document.getElementById('gulzhanPrintHeader');
    if (ph) ph.querySelector('.ph-month').textContent = MONTH_NAMES[currentMonth - 1] + ' 2026';

    // Чипы остатков
    const { balanceStart, balanceEnd } = calcBalance(currentMonth);
    const chipsEl = document.getElementById('gulzhanBalanceChips');
    if (chipsEl) {
      chipsEl.innerHTML = `
        <div class="bal-chip">
          <div class="bal-chip-label">Нач. месяца</div>
          <div class="bal-chip-value">${fmt(balanceStart)} ₸</div>
        </div>
        <div class="bal-chip">
          <div class="bal-chip-label">Кон. месяца</div>
          <div class="bal-chip-value">${fmt(balanceEnd)} ₸</div>
        </div>`;
    }
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

    let html = `<table class="summary-tbl">`;

    // thead
    html += `<thead><tr>`;
    html += `<th>Статья</th>`;
    html += `<th style="text-align:right">Итого</th>`;
    html += `<th style="text-align:right;font-size:10px;letter-spacing:0">% выр.</th>`;
    stores.forEach(s => {
      html += `<th style="text-align:right">${escHtml(summaryStoreName(s))}</th>`;
    });
    html += `</tr></thead>`;

    // tbody
    html += `<tbody>`;
    let isFirstGroup = true;
    groups.forEach(g => {
      const groupCls  = g.isIncome === true ? 'sg-income' : g.isIncome === false ? 'sg-expense' : 'sg-neutral';
      const firstCls  = isFirstGroup ? ' smg-first' : '';
      isFirstGroup = false;

      const nonZeroArticles  = g.articles.filter(a => Math.abs(a.total) >= 0.01);
      const groupIsAllZero   = nonZeroArticles.length === 0;
      const grpHideStyle     = (hideZeros && groupIsAllZero) ? ' style="display:none"' : '';

      html += `<tr class="${groupCls} smg-row${firstCls}"${grpHideStyle}>`;
      html += `<td>${escHtml(g.name)}</td>`;
      html += `<td>${renderSummaryCell(g.subtotalTotal)}</td>`;
      html += `<td>${renderPctCell(g.subtotalTotal, totalIncome, true)}</td>`;
      stores.forEach(s => {
        html += `<td>${renderSummaryCell(g.subtotals[s] || 0)}</td>`;
      });
      html += `</tr>`;

      let artRowIdx = 0;
      g.articles.forEach((a, aIdx) => {
        const isZero      = Math.abs(a.total) < 0.01;
        const rowBg       = (artRowIdx % 2 === 0) ? '#fff' : '#F9FAFB';
        artRowIdx++;
        const isLastInGroup  = aIdx === g.articles.length - 1;
        const lastCls        = isLastInGroup ? ' sma-last' : '';
        const totalBg        = a.total > 0 ? '#F0FDF4' : (a.total < 0 ? '#FFF5F5' : '');
        const totalBgStyle   = totalBg ? ` background:${totalBg};` : '';
        const rowHideStyle   = (hideZeros && isZero) ? 'display:none;' : '';
        const rowHideData    = isZero ? ' data-zero="1"' : '';

        // Определяем тип сдвига для подсветки
        const isAdvance    = GULZHAN_ADVANCE_ARTICLES.has(a.name);
        const isPrevMonth  = GULZHAN_PREV_MONTH_ARTICLES.has(a.name);
        const articleCls   = isAdvance ? ' gul-advance' : isPrevMonth ? ' gul-prevmonth' : '';
        const shiftLabel   = isAdvance
          ? `<span class="gul-shift-label">▲ данные за ${escHtml(prevMonthName)}${prevLoading ? ' …' : ''}</span>`
          : isPrevMonth
          ? `<span class="gul-shift-label">▼ данные за ${escHtml(nextMonthName)}${nextLoading ? ' …' : allMonthsLoaded[currentMonth + 1] !== 'done' ? ' (не загружено)' : ''}</span>`
          : '';

        html += `<tr class="sma-row${lastCls}"${rowHideData} style="${rowHideStyle}background:${rowBg}">`;
        html += `<td class="${articleCls}" style="background:${isAdvance || isPrevMonth ? '' : rowBg}">${escHtml(a.name)}${shiftLabel}</td>`;
        html += `<td style="${totalBgStyle}font-weight:700">${renderSummaryCell(a.total)}</td>`;
        html += `<td style="background:${rowBg}">${renderPctCell(a.total, totalIncome, false)}</td>`;
        if (a.isCompanyWide) {
          html += `<td colspan="${stores.length}" style="text-align:center">${renderSummaryCell(a.total)}</td>`;
        } else {
          stores.forEach(s => {
            html += `<td>${renderSummaryCell(a.byStore[s] || 0)}</td>`;
          });
        }
        html += `</tr>`;
      });
    });
    html += `</tbody></table>`;
    wrap.innerHTML = html;
  }
  ```

- [ ] **Step 3: Добавить `toggleGulzhanZeros()` сразу после**

  ```js
  function toggleGulzhanZeros() {
    const hide = document.getElementById('gulzhanHideZeros').checked;
    document.querySelectorAll('#gulzhanWrap tr.sma-row[data-zero="1"]').forEach(tr => {
      tr.style.display = hide ? 'none' : '';
    });
    document.querySelectorAll('#gulzhanWrap tr.smg-row').forEach(grpTr => {
      let hasVisible = false;
      let el = grpTr.nextElementSibling;
      while (el && el.classList.contains('sma-row')) {
        if (el.dataset.zero !== '1' || el.style.display !== 'none') { hasVisible = true; break; }
        el = el.nextElementSibling;
      }
      grpTr.style.display = (hide && !hasVisible) ? 'none' : '';
    });
  }
  ```

- [ ] **Step 4: Проверить в консоли**

  В консоли браузера (на загруженной странице с данными):
  ```js
  const d = buildGulzhanData(currentMonth);
  console.log('stores:', d.stores.length);   // должен быть > 0
  console.log('groups:', d.groups.length);   // должен быть > 0 (15+)
  console.log('totalIncome:', d.totalIncome); // > 0
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add dds.html
  git commit -m "feat(gulzhan): add buildGulzhanData, renderGulzhanMatrix, toggleGulzhanZeros"
  ```

---

### Task 6: Интеграция — renderAll, setSection, _refreshAfterMonthLoad

**Files:**
- Modify: `dds.html:618` (renderAll), `dds.html:1122` (_refreshAfterMonthLoad), `dds.html:1711` (setSection)

- [ ] **Step 1: Обновить `renderAll()`**

  Найди функцию `renderAll()` (~строка 618):
  ```js
  function renderAll() {
    renderKPI();
    renderExpensesSection();
    renderStoreGrid();
    renderSummaryMatrix();
  }
  ```
  Замени на:
  ```js
  function renderAll() {
    renderKPI();
    renderExpensesSection();
    renderStoreGrid();
    renderSummaryMatrix();
    renderGulzhanMatrix();
  }
  ```

- [ ] **Step 2: Обновить `_refreshAfterMonthLoad()`**

  Найди функцию `_refreshAfterMonthLoad()` (~строка 1122):
  ```js
  function _refreshAfterMonthLoad() {
    if (expensesTab === 'table') { renderMatrixTable(); return; }
    renderArticlesTable();
  }
  ```
  Замени на:
  ```js
  function _refreshAfterMonthLoad() {
    const gulzhanSection = document.getElementById('section-gulzhan');
    if (gulzhanSection && gulzhanSection.classList.contains('active')) {
      renderGulzhanMatrix();
      return;
    }
    if (expensesTab === 'table') { renderMatrixTable(); return; }
    renderArticlesTable();
  }
  ```

- [ ] **Step 3: Обновить `setSection()`**

  Найди функцию `setSection()` (~строка 1711):
  ```js
  function setSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-' + name).classList.add('active');
    closeDrill();
    if (name === 'expenses') loadAllMonths();
    if (name === 'summary' && !document.getElementById('stateContent').classList.contains('hidden')) {
      renderSummaryMatrix();
    }
  }
  ```
  Замени на:
  ```js
  function setSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + name).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-' + name).classList.add('active');
    closeDrill();
    if (name === 'expenses') loadAllMonths();
    if (name === 'summary' && !document.getElementById('stateContent').classList.contains('hidden')) {
      renderSummaryMatrix();
    }
    if (name === 'gulzhan' && !document.getElementById('stateContent').classList.contains('hidden')) {
      renderGulzhanMatrix();
    }
  }
  ```

- [ ] **Step 4: Финальная проверка в браузере**

  1. Перезагрузи страницу, выбери месяц (например, март)
  2. Кликни «👩‍💼 ДДС Гульжан А.»
  3. Должна отрисоваться таблица с теми же группами что в Сводной
  4. Строки «Аренда торговых точек», «Аренда офиса», «Аренда и Охрана Склада» — янтарный фон, лейбл «▲ данные за Февраль»
  5. Строки «Зарплата Продавцы» и другие из группы Зарплаты + «Налоги ЗП» — сиреневый фон, лейбл «▼ данные за Апрель»
  6. Числа в аренда-строках совпадают с данными февраля (можно сверить с Сводной, переключив месяц на февраль)
  7. Чипы остатков в шапке заполнены
  8. Чекбокс «Скрыть нулевые» работает
  9. Если сменить месяц на январь — аренда берёт данные из константы GULZHAN_DEC2025_RENT, зарплаты показывают данные февраля
  10. Нет ошибок в консоли

- [ ] **Step 5: Commit**

  ```bash
  git add dds.html
  git commit -m "feat(gulzhan): integrate renderGulzhanMatrix into renderAll, setSection, _refreshAfterMonthLoad"
  ```

---

### Task 7: Деплой на GitHub Pages

- [ ] **Step 1: Пушим в main**

  ```bash
  git push origin main
  ```

- [ ] **Step 2: Проверить деплой**

  Через 1-2 минуты открыть:
  `https://edigeabdikarim.github.io/daracom-analytics/dds.html`

  Проверить: таб «ДДС Гульжан А.» появился, таблица отрисовывается, цветовая маркировка работает.

---

## Граничные случаи — напоминание

| Ситуация | Поведение |
|----------|-----------|
| `currentMonth === 1`, аренда | Данные из `GULZHAN_DEC2025_RENT` — синтетические строки |
| M+1 ещё не загружен | `ensureMonthLoaded` запускает загрузку; ячейки зарплат показывают `—` (пустые) пока не придут данные; после загрузки `_refreshAfterMonthLoad` перерисует таблицу |
| M+1 `=== 13` | `ensureMonthLoaded(13)` → `m > 12` → ничего не делает; зарплаты показывают `—` |
