# Gulzhan Quarterly Articles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить поддержку квартальных статей в ДДС Гульжан А., новые статьи аренды в Сводную, и исправить отображение месяцев без транзакций (апрель и далее).

**Architecture:** Все изменения — в одном файле `dds.html`. Новые константы описывают правила per-store сдвига. Новая функция `buildQuarterlyRows()` генерирует синтетические строки с пропорциями по продажам. `buildGulzhanData()` рефакторится для поддержки per-store логики.

**Tech Stack:** Vanilla JS, inline HTML/CSS, без тестового фреймворка — проверка через браузер.

**Spec:** `docs/superpowers/specs/2026-03-30-gulzhan-quarterly-articles-design.md`

---

## Файлы

- Modify: `dds.html` — все изменения в одном файле

---

### Task 1: Фикс onDataLoaded — апрель и пустые месяцы

**Files:**
- Modify: `dds.html:622-635`

- [ ] **Шаг 1: Заменить блок onDataLoaded**

Найти (строки 622–635):
```js
function onDataLoaded(data) {
  allRows = data.rows || [];
  allMonthsData[currentMonth] = allRows;
  allMonthsLoaded[currentMonth] = 'done';
  if (allRows.length === 0) {
    document.getElementById('emptyMsg').textContent = 'Нет данных за ' + MONTH_NAMES[currentMonth - 1];
    showState('empty');
    return;
  }
  document.getElementById('headerSub').textContent =
    MONTH_NAMES[currentMonth - 1] + ' 2026 · ' + allRows.length + ' операций';
  populateStoreFilter();
  resetFilters();
}
```

Заменить на:
```js
function onDataLoaded(data) {
  allRows = data.rows || [];
  allMonthsData[currentMonth] = allRows;
  allMonthsLoaded[currentMonth] = 'done';
  if (allRows.length === 0) {
    // Gulzhan показывает авансовые данные даже без транзакций текущего месяца
    const gulzhanActive = document.getElementById('section-gulzhan') &&
      document.getElementById('section-gulzhan').classList.contains('active');
    if (gulzhanActive) {
      showState('content');
      renderGulzhanMatrix();
      return;
    }
    document.getElementById('emptyMsg').textContent = 'Нет данных за ' + MONTH_NAMES[currentMonth - 1];
    showState('empty');
    return;
  }
  document.getElementById('headerSub').textContent =
    MONTH_NAMES[currentMonth - 1] + ' 2026 · ' + allRows.length + ' операций';
  populateStoreFilter();
  resetFilters();
}
```

- [ ] **Шаг 2: Убрать ранний return в renderGulzhanMatrix**

Найти в `renderGulzhanMatrix()` (строки 1624–1627):
```js
  if (!allRows || allRows.length === 0) {
    wrap.innerHTML = `<p style="padding:24px;color:#9CA3AF;text-align:center;">Нет данных за ${escHtml(MONTH_NAMES[currentMonth - 1])}</p>`;
    return;
  }
```

Удалить эти 4 строки целиком. Пустой результат уже обрабатывается проверкой `stores.length === 0` ниже.

- [ ] **Шаг 3: Проверить в браузере**

1. Открыть `dds.html`
2. Переключить месяц на «Апрель»
3. Убедиться, что секция «ДДС Гульжан А.» показывает таблицу (или «Нет данных по магазинам»), а не пустой экран

- [ ] **Шаг 4: Коммит**

```bash
git add dds.html
git commit -m "fix(gulzhan): render matrix even when current month has no own transactions"
```

---

### Task 2: Новые статьи в DDS_ARTICLES_ORDER

**Files:**
- Modify: `dds.html:1197-1201`

- [ ] **Шаг 1: Добавить статьи**

Найти строку (около 1201):
```js
  { article: 'Охрана',                                       group: 'Аренда и ком. услуги',      isIncome: false },
```

Добавить сразу после неё:
```js
  { article: 'Аренда переменная',                            group: 'Аренда и ком. услуги',      isIncome: false },
  { article: 'Обеспечительный взнос',                        group: 'Аренда и ком. услуги',      isIncome: false },
```

- [ ] **Шаг 2: Проверить в браузере**

1. Открыть `dds.html`, перейти на вкладку «Сводная»
2. В группе «Аренда и ком. услуги» должны появиться строки «Аренда переменная» и «Обеспечительный взнос»
3. Если в Google Sheets есть данные за текущий месяц — они должны там отображаться

- [ ] **Шаг 3: Коммит**

```bash
git add dds.html
git commit -m "feat(dds): add Аренда переменная and Обеспечительный взнос to DDS_ARTICLES_ORDER"
```

---

### Task 3: CSS для новых визуальных маркеров

**Files:**
- Modify: `dds.html:243-249`

- [ ] **Шаг 1: Добавить стили**

Найти блок (строки 242–249):
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

Заменить на:
```css
    /* ── ДДС Гульжан А. — цветовая маркировка статей ── */
    .gul-advance    { background: #FEF3C7 !important; color: #92400E !important; }
    .gul-prevmonth  { background: #EDE9FE !important; color: #5B21B6 !important; }
    .gul-quarterly  { background: #CFFAFE !important; color: #155E75 !important; }
    .gul-mixed      { background: #E0F2FE !important; color: #075985 !important; }
    .gul-shift-label { display: block; font-size: 10px; font-weight: 400; margin-top: 2px; opacity: 0.75; }
    @media print {
      .gul-advance    { background: #FEF3C7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .gul-prevmonth  { background: #EDE9FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .gul-quarterly  { background: #CFFAFE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .gul-mixed      { background: #E0F2FE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
```

- [ ] **Шаг 2: Коммит**

```bash
git add dds.html
git commit -m "feat(gulzhan): add CSS classes gul-quarterly and gul-mixed"
```

---

### Task 4: Новые константы per-store логики

**Files:**
- Modify: `dds.html:1321` (после GULZHAN_PREV_MONTH_ARTICLES)

- [ ] **Шаг 1: Добавить константы**

Найти конец блока `GULZHAN_PREV_MONTH_ARTICLES` (около строки 1321):
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

Добавить после закрывающей скобки:
```js

// Статьи, где только часть магазинов берётся из M+1 (ключ = статья, значение = Set магазинов)
const GULZHAN_PREVMONTH_STORES = {
  'Аренда переменная': new Set(['Магазин Астана', 'Магазин Above Астана']),
};

// Статьи с квартальным распределением (null = все магазины без исключений)
const GULZHAN_QUARTERLY_STORES = {
  'Аренда переменная':       new Set(['Магазин Есентай']),
  'Налоги ИП (квартальные)': null,
};
```

- [ ] **Шаг 2: Коммит**

```bash
git add dds.html
git commit -m "feat(gulzhan): add GULZHAN_PREVMONTH_STORES and GULZHAN_QUARTERLY_STORES constants"
```

---

### Task 5: Функция buildQuarterlyRows()

**Files:**
- Modify: `dds.html` — добавить перед `buildGulzhanData()` (около строки 1570)

- [ ] **Шаг 1: Добавить функцию**

Найти строку:
```js
// advance → берём из month-1 (или из GULZHAN_DEC2025_RENT для января)
```

Добавить перед ней:
```js
// Возвращает квартальный платёжный месяц для месяца M:
// Q1(1-3)→4, Q2(4-6)→7, Q3(7-9)→10, Q4(10-12)→13 (вне диапазона = нет данных)
function quarterPaymentMonth(month) {
  return Math.ceil(month / 3) * 3 + 1;
}

// Строит синтетические строки квартального распределения для статьи article.
// storeSet: Set магазинов для фильтрации, или null (все магазины).
// month: текущий отображаемый месяц (1-12).
// Результат: массив строк с пропорционально распределённой суммой.
function buildQuarterlyRows(article, storeSet, month) {
  const q       = Math.ceil(month / 3);
  const qStart  = q * 3 - 2;
  const qMonths = [qStart, qStart + 1, qStart + 2];
  const payM    = q * 3 + 1;

  if (payM > 12) return [];               // Q4 — следующий год, нет данных

  // Инициируем загрузку нужных месяцев (не блокируем рендер)
  ensureMonthLoaded(payM);
  qMonths.forEach(m => { if (m >= 1 && m <= 12) ensureMonthLoaded(m); });

  const payData = allMonthsData[payM];
  if (!payData) return [];

  // Платёжные строки по статье в платёжном месяце
  const payRows = payData.filter(r => {
    if (r.activity === 'Техническая операция') return false;
    if (r.direction === 'Операция') return false;
    if ((r.article || '').trim() !== article) return false;
    if (storeSet !== null && !storeSet.has(r.store)) return false;
    return true;
  });
  if (payRows.length === 0) return [];

  // Суммируем платёж по магазину
  const storePayments = {};
  payRows.forEach(r => {
    const s = r.store || 'Общее';
    storePayments[s] = (storePayments[s] || 0) + Number(r.amount);
  });

  // Считаем продажи (Продажи товаров) магазина за каждый квартальный месяц
  const storeSales = {}; // { store: { month: sum } }
  qMonths.forEach(m => {
    (allMonthsData[m] || []).forEach(r => {
      if ((r.article || '').trim() !== 'Продажи товаров') return;
      const s = r.store || 'Общее';
      if (!storeSales[s]) storeSales[s] = {};
      storeSales[s][m] = (storeSales[s][m] || 0) + Number(r.amount);
    });
  });

  // Синтетические строки для текущего месяца month
  const result = [];
  Object.entries(storePayments).forEach(([store, payment]) => {
    const salesByM    = storeSales[store] || {};
    const totalSales  = qMonths.reduce((s, m) => s + (salesByM[m] || 0), 0);
    if (totalSales === 0) return;  // нет продаж → нельзя рассчитать пропорцию
    const monthSales  = salesByM[month] || 0;
    const share       = payment * (monthSales / totalSales);
    if (Math.abs(share) < 0.01) return;
    result.push({
      article, store,
      amount: share,
      activity: 'Операционная',
      direction: 'Адм. расходы',
      type: share > 0 ? 'Поступление' : 'Выбытие',
    });
  });
  return result;
}

```

- [ ] **Шаг 2: Проверить синтаксис**

Открыть `dds.html` в браузере. Должна открыться без ошибок в консоли (F12 → Console).

- [ ] **Шаг 3: Коммит**

```bash
git add dds.html
git commit -m "feat(gulzhan): add quarterPaymentMonth() and buildQuarterlyRows() for quarterly proportional allocation"
```

---

### Task 6: Рефакторинг buildGulzhanData()

**Files:**
- Modify: `dds.html:1573-1618`

- [ ] **Шаг 1: Заменить функцию buildGulzhanData**

Найти и заменить всю функцию `buildGulzhanData` (строки ~1573–1618):

```js
function buildGulzhanData(month) {
  const filterRow = r => {
    if (r.activity === 'Техническая операция') return false;
    if (r.direction === 'Операция') return false;
    return true;
  };
  const getArt = r => r.article && r.article.trim() ? r.article.trim() : 'Прочее';

  // Текущий месяц: исключаем advance, prevmonth, per-store-prevmonth и квартальные строки
  const rowsCurrent = (allMonthsData[month] || []).filter(r => {
    if (!filterRow(r)) return false;
    const art = getArt(r);
    if (GULZHAN_ADVANCE_ARTICLES.has(art)) return false;
    if (GULZHAN_PREV_MONTH_ARTICLES.has(art)) return false;
    // Per-store prevmonth: убираем нужные магазины из текущего месяца
    if (GULZHAN_PREVMONTH_STORES[art] && GULZHAN_PREVMONTH_STORES[art].has(r.store)) return false;
    // Квартальные: убираем нужные магазины (null = все магазины)
    if (GULZHAN_QUARTERLY_STORES.hasOwnProperty(art)) {
      const qStores = GULZHAN_QUARTERLY_STORES[art];
      if (qStores === null || qStores.has(r.store)) return false;
    }
    return true;
  });

  // Advance-статьи: из M-1 (или хардкод декабря для января)
  let rowsAdvance = [];
  if (month === 1) {
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
      return GULZHAN_ADVANCE_ARTICLES.has(getArt(r));
    });
  }

  // PrevMonth-статьи целиком (зарплаты, Налоги ЗП): из M+1
  const rowsPrevMonth = (allMonthsData[month + 1] || []).filter(r => {
    if (!filterRow(r)) return false;
    return GULZHAN_PREV_MONTH_ARTICLES.has(getArt(r));
  });

  // Per-store prevmonth (Аренда переменная, Астана/AboveАстана): из M+1
  let rowsPrevMonthPartial = [];
  if (month < 12) {
    const nextData = allMonthsData[month + 1] || [];
    Object.entries(GULZHAN_PREVMONTH_STORES).forEach(([art, stores]) => {
      const filtered = nextData.filter(r => {
        if (!filterRow(r)) return false;
        return getArt(r) === art && stores.has(r.store);
      });
      rowsPrevMonthPartial = rowsPrevMonthPartial.concat(filtered);
    });
  }

  // Квартальные строки (Есентай + Налоги ИП)
  let rowsQuarterly = [];
  Object.entries(GULZHAN_QUARTERLY_STORES).forEach(([art, storeSet]) => {
    rowsQuarterly = rowsQuarterly.concat(buildQuarterlyRows(art, storeSet, month));
  });

  return buildSummaryData([
    ...rowsCurrent,
    ...rowsAdvance,
    ...rowsPrevMonth,
    ...rowsPrevMonthPartial,
    ...rowsQuarterly,
  ]);
}
```

- [ ] **Шаг 2: Проверить синтаксис**

Открыть `dds.html` в браузере, убедиться — нет ошибок в консоли.

- [ ] **Шаг 3: Коммит**

```bash
git add dds.html
git commit -m "feat(gulzhan): refactor buildGulzhanData to support per-store prevmonth and quarterly logic"
```

---

### Task 7: Обновить renderGulzhanMatrix — загрузка месяцев и лейблы

**Files:**
- Modify: `dds.html:1629-1631` и `dds.html:1722-1729`

- [ ] **Шаг 1: Расширить загрузку смежных месяцев**

Найти (строки ~1629–1631):
```js
  // Запускаем загрузку смежных месяцев (не блокируем рендер)
  ensureMonthLoaded(currentMonth - 1);
  ensureMonthLoaded(currentMonth + 1);
```

Заменить на:
```js
  // Запускаем загрузку смежных и квартальных месяцев (не блокируем рендер)
  ensureMonthLoaded(currentMonth - 1);
  ensureMonthLoaded(currentMonth + 1);
  const _qPayM = quarterPaymentMonth(currentMonth);
  if (_qPayM <= 12) ensureMonthLoaded(_qPayM);
  const _qStart = Math.ceil(currentMonth / 3) * 3 - 2;
  [_qStart, _qStart + 1, _qStart + 2].forEach(m => { if (m >= 1 && m <= 12) ensureMonthLoaded(m); });
```

- [ ] **Шаг 2: Обновить логику визуальных маркеров**

Найти (строки ~1722–1729):
```js
      // Определяем тип сдвига для подсветки
      const isAdvance    = GULZHAN_ADVANCE_ARTICLES.has(a.name);
      const isPrevMonth  = GULZHAN_PREV_MONTH_ARTICLES.has(a.name);
      const articleCls   = isAdvance ? ' gul-advance' : isPrevMonth ? ' gul-prevmonth' : '';
      const shiftLabel   = isAdvance
        ? `<span class="gul-shift-label">▲ данные за ${escHtml(prevMonthName)}${prevLoading ? ' …' : ''}</span>`
        : isPrevMonth
        ? `<span class="gul-shift-label">▼ данные за ${escHtml(nextMonthName)}${nextLoading ? ' …' : allMonthsLoaded[currentMonth + 1] !== 'done' ? ' (не загружено)' : ''}</span>`
        : '';
```

Заменить на:
```js
      // Определяем тип сдвига для подсветки
      const isAdvance        = GULZHAN_ADVANCE_ARTICLES.has(a.name);
      const isPrevMonth      = GULZHAN_PREV_MONTH_ARTICLES.has(a.name);
      const isQuarterlyOnly  = GULZHAN_QUARTERLY_STORES.hasOwnProperty(a.name) && !GULZHAN_PREVMONTH_STORES.hasOwnProperty(a.name);
      const isMixed          = GULZHAN_PREVMONTH_STORES.hasOwnProperty(a.name);
      const articleCls       = isAdvance       ? ' gul-advance'
                             : isPrevMonth      ? ' gul-prevmonth'
                             : isQuarterlyOnly  ? ' gul-quarterly'
                             : isMixed          ? ' gul-mixed'
                             : '';
      const shiftLabel       = isAdvance
        ? `<span class="gul-shift-label">▲ данные за ${escHtml(prevMonthName)}${prevLoading ? ' …' : ''}</span>`
        : isPrevMonth
        ? `<span class="gul-shift-label">▼ данные за ${escHtml(nextMonthName)}${nextLoading ? ' …' : allMonthsLoaded[currentMonth + 1] !== 'done' ? ' (не загружено)' : ''}</span>`
        : isQuarterlyOnly
        ? `<span class="gul-shift-label">◇ квартальные пропорции</span>`
        : isMixed
        ? `<span class="gul-shift-label">◆ сдвиг по части магазинов</span>`
        : '';
```

- [ ] **Шаг 3: Проверить в браузере**

1. Открыть `dds.html` → «ДДС Гульжан А.»
2. Январь: «Аренда торговых точек» имеет янтарный маркер ▲
3. Январь/Февраль/Март: «Зарплата Продавцы» имеет сиреневый маркер ▼
4. Статья «Налоги ИП (квартальные)» имеет бирюзовый маркер ◇
5. «Аренда переменная» имеет серо-синий маркер ◆
6. Апрель: таблица открывается (не пустой экран), видны авансовые данные аренды из марта

- [ ] **Шаг 4: Коммит**

```bash
git add dds.html
git commit -m "feat(gulzhan): load quarterly months in renderGulzhanMatrix, update shift labels"
```

---

### Task 8: Итоговая проверка и деплой

- [ ] **Шаг 1: Проверить все сценарии**

| Сценарий | Ожидаемый результат |
|---|---|
| Янв: «Аренда торговых точек» | Янтарный ▲, данные из декабря 2025 (хардкод) |
| Фев: «Аренда торговых точек» | Янтарный ▲, данные из января |
| Апр: переключить на «ДДС Гульжан А.» | Таблица отображается (не пустой экран) |
| Апр: «Аренда торговых точек» | Янтарный ▲, данные из марта |
| Янв: «Налоги ИП (квартальные)» | Бирюзовый ◇, пропорция от апрельского платежа |
| Фев: «Налоги ИП (квартальные)» | Бирюзовый ◇, пропорция от апрельского платежа |
| Мар: «Налоги ИП (квартальные)» | Бирюзовый ◇, пропорция от апрельского платежа |
| Янв: «Аренда переменная» (Астана) | Часть из M+1 (Feb) — ◆ маркер |
| Янв: «Аренда переменная» (Есентай) | Квартальная пропорция от апрельского платежа |
| Сводная: группа «Аренда и ком. услуги» | Есть строки «Аренда переменная» и «Обеспечительный взнос» |

- [ ] **Шаг 2: Итоговый коммит и деплой**

```bash
git add dds.html
git status
git push
```
