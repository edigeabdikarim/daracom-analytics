# DDS Компания Store Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Отображать статьи с `store = "Компания"` в матрице Сводной с объединёнными (colspan) магазинными ячейками вместо колонки «Компания» среди обычных магазинов.

**Architecture:** Два изменения в `dds.html`: (1) `buildSummaryData` фильтрует «Компания» из `stores` и добавляет флаг `isCompanyWide` к каждой статье; (2) `renderSummaryMatrix` рендерит статьи с `isCompanyWide=true` через `colspan`.

**Tech Stack:** Vanilla JS, HTML table, без тестового фреймворка — верификация через браузер и console.log.

---

## Файлы

| Файл | Действие | Строки |
|------|----------|--------|
| `dds.html` | Modify | 1165–1169, 1196–1201, 1234–1235, 1268–1278 |

---

### Task 1: Фильтрация «Компания» из массива stores

**Files:**
- Modify: `dds.html:1165-1169`

- [ ] **Шаг 1: Найти блок сортировки stores**

В `dds.html` найти строки 1165–1169:
```js
// Сортировка магазинов: по убыванию оборота, тайбрейкер — алфавит
const stores = Object.keys(storeTurnover).sort((a, b) => {
  const diff = storeTurnover[b] - storeTurnover[a];
  return diff !== 0 ? diff : a.localeCompare(b, 'ru');
});
```

- [ ] **Шаг 2: Добавить `.filter()` после `.sort()`**

Заменить на:
```js
// Сортировка магазинов: по убыванию оборота, тайбрейкер — алфавит; «Компания» исключается
const stores = Object.keys(storeTurnover).sort((a, b) => {
  const diff = storeTurnover[b] - storeTurnover[a];
  return diff !== 0 ? diff : a.localeCompare(b, 'ru');
}).filter(s => s !== 'Компания');
```

- [ ] **Шаг 3: Верификация в консоли браузера**

Открыть `dds.html` в браузере, перейти в раздел «Сводная», открыть DevTools Console и выполнить:
```js
const { stores } = buildSummaryData(allRows);
console.log('stores:', stores);
```
Ожидаемый результат: массив магазинов **без** «Компания» в списке.

- [ ] **Шаг 4: Коммит**

```bash
git add dds.html
git commit -m "feat: exclude Компания from stores array in buildSummaryData"
```

---

### Task 2: Флаг isCompanyWide для статей

**Files:**
- Modify: `dds.html:1196-1201`

- [ ] **Шаг 1: Найти блок `articleNames.map`**

В `dds.html` строки 1196–1201:
```js
const articles = g.articleNames.map(name => {
  const byStore = {};
  stores.forEach(s => { byStore[s] = (cellData[name] && cellData[name][s]) || 0; });
  const total = articleTotal[name] || 0;
  return { name, byStore, total };
});
```

- [ ] **Шаг 2: Добавить вычисление isCompanyWide**

Заменить на:
```js
const articles = g.articleNames.map(name => {
  const byStore = {};
  stores.forEach(s => { byStore[s] = (cellData[name] && cellData[name][s]) || 0; });
  const total = articleTotal[name] || 0;
  const keys = Object.keys(cellData[name] || {});
  const isCompanyWide = keys.length > 0 && keys.every(s => s === 'Компания');
  return { name, byStore, total, isCompanyWide };
});
```

- [ ] **Шаг 3: Верификация в консоли браузера**

```js
const { groups } = buildSummaryData(allRows);
const companyArticles = groups.flatMap(g => g.articles).filter(a => a.isCompanyWide);
console.log('company-wide articles:', companyArticles.map(a => a.name));
```
Ожидаемый результат: список статей типа «Закупка товара», «Ремонт Фридом», «Оплата СМС рассылок» и т.д. — именно те, что в данных имеют только `store = "Компания"`.

- [ ] **Шаг 4: Коммит**

```bash
git add dds.html
git commit -m "feat: add isCompanyWide flag to article objects in buildSummaryData"
```

---

### Task 3: Рендер colspan для company-wide статей + guard stores.length

**Files:**
- Modify: `dds.html:1234-1235, 1268-1278`

- [ ] **Шаг 1: Добавить guard после buildSummaryData**

Найти строки 1234–1235:
```js
const { stores, groups } = buildSummaryData(allRows);
const hideZeros = document.getElementById('summaryHideZeros') && document.getElementById('summaryHideZeros').checked;
```

Заменить на:
```js
const { stores, groups } = buildSummaryData(allRows);
if (stores.length === 0) {
  wrap.innerHTML = `<p style="padding:24px;color:#9CA3AF;text-align:center;">Нет данных по магазинам за ${escHtml(MONTH_NAMES[currentMonth - 1])}</p>`;
  return;
}
const hideZeros = document.getElementById('summaryHideZeros') && document.getElementById('summaryHideZeros').checked;
```

- [ ] **Шаг 2: Обновить рендер строк статей**

Найти блок строк 1268–1278:
```js
// Строки статей
g.articles.forEach(a => {
  const isZero = Math.abs(a.total) < 0.01;
  const rowHideClass = (hideZeros && isZero) ? ' data-zero="1" style="display:none"' : (isZero ? ' data-zero="1"' : '');
  html += `<tr class="sma-row"${rowHideClass}>`;
  html += `<td style="padding-left:20px">${escHtml(a.name)}</td>`;
  html += `<td>${renderSummaryCell(a.total)}</td>`;
  stores.forEach(s => {
    html += `<td>${renderSummaryCell(a.byStore[s] || 0)}</td>`;
  });
  html += `</tr>`;
});
```

Заменить на:
```js
// Строки статей
g.articles.forEach(a => {
  const isZero = Math.abs(a.total) < 0.01;
  const rowHideClass = (hideZeros && isZero) ? ' data-zero="1" style="display:none"' : (isZero ? ' data-zero="1"' : '');
  html += `<tr class="sma-row"${rowHideClass}>`;
  html += `<td style="padding-left:20px">${escHtml(a.name)}</td>`;
  html += `<td>${renderSummaryCell(a.total)}</td>`;
  if (a.isCompanyWide) {
    html += `<td colspan="${stores.length}" style="text-align:center">${renderSummaryCell(a.total)}</td>`;
  } else {
    stores.forEach(s => {
      html += `<td>${renderSummaryCell(a.byStore[s] || 0)}</td>`;
    });
  }
  html += `</tr>`;
});
```

- [ ] **Шаг 3: Визуальная проверка в браузере**

Открыть `dds.html`, перейти в «Сводная». Проверить:
1. Колонка «Компания» **отсутствует** в заголовке таблицы
2. Статьи типа «Закупка товара» / «Зарплата Водитель» — строка содержит ячейку на всю ширину магазинных колонок с суммой по центру
3. Обычные статьи (зарплаты по магазинам, аренда и т.д.) — отображаются без изменений, разбивка по магазинам сохранена
4. Toggle «Скрыть нулевые» — по-прежнему работает

- [ ] **Шаг 4: Коммит**

```bash
git add dds.html
git commit -m "feat: render isCompanyWide articles with colspan in Сводная matrix"
```

---

### Task 4: Push и деплой

- [ ] **Шаг 1: Push на GitHub**

```bash
git push
```

Ожидаемый результат: изменения в `main`, GitHub Pages автоматически задеплоит обновлённый `dds.html`.

- [ ] **Шаг 2: Проверка на GitHub Pages**

Открыть `https://edigeabdikarim.github.io/daracom-analytics/dds.html`, перейти в «Сводная», убедиться что изменения видны в продакшне.
