/**
 * Daracom Executive Dashboard — Google Apps Script
 * Разверни как Web App (Execute as: Me, Access: Anyone)
 * Передай URL в CONFIG.GAS_URL в dashboard.html
 *
 * Параметры запроса:
 *   ?month=3        — номер месяца (1–12), по умолчанию текущий
 */

// ═══════════════════ НАСТРОЙКИ ═══════════════════
const OPIU_ID = '1Z6KR6NK2Y86QrQ2aLW-vRk44yP98OMU0mxzNakw8v_s';
const DDS_ID  = '171I_chBn4SzuinIL4USP8QI9FL8g1X0MQEwqFwDuscc';

const STORE_NAMES = [
  'Магазин Астана', 'Магазин Above Астана', 'Магазин Мира',
  'Магазин Есентай', 'Магазин Абайка', 'Магазин Above',
  'Магазин Восход',  'Магазин Kaspi'
];
// Индексы колонок ОПиУ (0-based): C=2 … J=9, M=12 (Итого)
const STORE_COLS = [2, 3, 4, 5, 6, 7, 8, 9];
const TOTAL_COL  = 12;

// Константы для opiu endpoint (включают Online Продажи).
// Намеренно отдельный список от STORE_NAMES: добавлен Online (col 10) и не ломает dashboard-логику
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

// ═══════════════════ ENTRY POINT ═════════════════
function doGet(e) {
  // Роутинг: ?action=dds → ДДС endpoint (логика в dds.gs)
  if (e && e.parameter && e.parameter.action === 'dds') {
    return doGetDDS(e);
  }
  // Роутинг: ?action=dds_balance → суммы по месяцам для расчёта остатков
  if (e && e.parameter && e.parameter.action === 'dds_balance') {
    return doGetDDSBalance();
  }
  // Роутинг: ?action=noncash_balances → актуальные остатки по безналу (направление × банк)
  if (e && e.parameter && e.parameter.action === 'noncash_balances') {
    return doGetNoncashBalances();
  }
  // Роутинг: ?action=noncash_archive → исторические остатки по безналу (по концу месяца)
  if (e && e.parameter && e.parameter.action === 'noncash_archive') {
    return doGetNoncashArchive();
  }
  if (e && e.parameter && e.parameter.action === 'opiu') {
    return doGetOPiU(e);
  }

  try {
    const month = parseInt((e && e.parameter && e.parameter.month) || (new Date().getMonth() + 1));
    if (isNaN(month) || month < 1 || month > 12) throw new Error('Некорректный номер месяца');
    const data = getDashboardData(month);
    return buildResponse(JSON.stringify({ ok: true, data }));
  } catch (err) {
    return buildResponse(JSON.stringify({ ok: false, error: err.message }));
  }
}

function buildResponse(body) {
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════ ГЛАВНАЯ ЛОГИКА ══════════════
function getDashboardData(month) {
  const opiuSS = SpreadsheetApp.openById(OPIU_ID);
  const ddsSS  = SpreadsheetApp.openById(DDS_ID);

  // --- ОПиУ текущий месяц ---
  const curSheet = opiuSS.getSheetByName(String(month));
  if (!curSheet) throw new Error('Лист "' + month + '" не найден в ОПиУ');
  const curRaw = curSheet.getRange('A1:M85').getValues();

  // --- ОПиУ предыдущий месяц ---
  const prevMonth = month > 1 ? month - 1 : null;
  const prevRaw   = prevMonth ? (() => {
    const sh = opiuSS.getSheetByName(String(prevMonth));
    return sh ? sh.getRange('A1:M85').getValues() : null;
  })() : null;

  // --- ДДС: месяц (все строки) ---
  const ddsSheet = ddsSS.getSheetByName('ДДС: месяц');
  if (!ddsSheet) throw new Error('Лист "ДДС: месяц" не найден');
  const ddsRaw = ddsSheet.getDataRange().getValues();

  // --- Динамика ---
  const factSheet = opiuSS.getSheetByName('Факт');
  const factRaw   = factSheet ? factSheet.getRange('A1:M10').getValues() : null;

  // --- Парсинг ---
  const current = parseOPiU(curRaw);
  const expCur  = parseDDS(ddsRaw, month);
  current.totalExpenses    = expCur.totalExpenses;
  current.expensesByGroup  = expCur.expensesByGroup;

  let previous = null;
  if (prevRaw) {
    previous = parseOPiUSimple(prevRaw);
    const expPrev = parseDDS(ddsRaw, prevMonth);
    previous.totalExpenses = expPrev.totalExpenses;
  }

  const dynamics = buildDynamics(opiuSS, factRaw, month);

  return { month, current, previous, dynamics };
}

// ═══════════════════ ПАРСИНГ ОПиУ ════════════════

function parseNum(v) {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[\s\u00a0\u202f]+/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parsePct(v) {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace('%', '').replace(',', '.').trim();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  // если значение уже как доля (0.30), то оставляем; если как процент (30), делим
  return Math.abs(n) > 1 ? n / 100 : n;
}

function findRow(data, label) {
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][1]).trim() === label) return data[i];
  }
  return null;
}

function storeMap(row) {
  const m = {};
  if (!row) { STORE_NAMES.forEach(n => { m[n] = 0; }); return m; }
  STORE_NAMES.forEach((name, i) => { m[name] = parseNum(row[STORE_COLS[i]]); });
  return m;
}

function pctMap(row) {
  const m = {};
  if (!row) { STORE_NAMES.forEach(n => { m[n] = 0; }); return m; }
  STORE_NAMES.forEach((name, i) => { m[name] = parsePct(row[STORE_COLS[i]]); });
  return m;
}

function parseOPiU(data) {
  const revenueRow   = findRow(data, 'Выручка');
  const varExpRow    = findRow(data, 'Переменные');
  const margRow      = findRow(data, 'Маржинальный доход');
  const margPctRow   = findRow(data, 'Рентабельность по маржинальному доходу, %');
  const fixedRow     = findRow(data, 'Прямые постоянные');
  const grossRow     = findRow(data, 'Валовая прибыль по направлениям');
  const grossPctRow  = findRow(data, 'Рентабельность по направлениям, %');

  return {
    revenue:          { total: parseNum(revenueRow?.[TOTAL_COL]),  stores: storeMap(revenueRow) },
    variableExpenses: { total: parseNum(varExpRow?.[TOTAL_COL]),   stores: storeMap(varExpRow) },
    marginalProfit:   { total: parseNum(margRow?.[TOTAL_COL]),     pct: parsePct(margPctRow?.[TOTAL_COL]), stores: storeMap(margRow) },
    marginalPct:      { stores: pctMap(margPctRow) },
    fixedExpenses:    { total: parseNum(fixedRow?.[TOTAL_COL]),    stores: storeMap(fixedRow) },
    grossProfit:      { total: parseNum(grossRow?.[TOTAL_COL]),    pct: parsePct(grossPctRow?.[TOTAL_COL]), stores: storeMap(grossRow) },
    grossPct:         { stores: pctMap(grossPctRow) },
  };
}

function parseOPiUSimple(data) {
  const revenueRow  = findRow(data, 'Выручка');
  const margRow     = findRow(data, 'Маржинальный доход');
  const margPctRow  = findRow(data, 'Рентабельность по маржинальному доходу, %');
  const grossRow    = findRow(data, 'Валовая прибыль по направлениям');
  const grossPctRow = findRow(data, 'Рентабельность по направлениям, %');
  return {
    revenue:        { total: parseNum(revenueRow?.[TOTAL_COL]) },
    marginalProfit: { total: parseNum(margRow?.[TOTAL_COL]), pct: parsePct(margPctRow?.[TOTAL_COL]) },
    grossProfit:    { total: parseNum(grossRow?.[TOTAL_COL]), pct: parsePct(grossPctRow?.[TOTAL_COL]) },
  };
}

// ═══════════════════ ПАРСИНГ ДДС ═════════════════

function parseDDS(allRows, month) {
  const groups = {
    'Закупка товара': 0, 'Зарплаты': 0, 'Аренда': 0,
    'Маркетинг': 0, 'Налоги': 0, 'Логистика': 0, 'Прочие': 0
  };
  let totalExpenses = 0;

  // Найти заголовочную строку (где col C = 'Мсц (цифрой)' или col A = 'Месяц')
  let headerIdx = 2; // по умолчанию строка 3 (0-based = 2)
  for (let i = 0; i < Math.min(6, allRows.length); i++) {
    const c2 = String(allRows[i][2]);
    if (c2.includes('цифрой') || c2 === 'Мсц (цифрой)') { headerIdx = i; break; }
    if (String(allRows[i][0]) === 'Месяц' && String(allRows[i][1]) === 'Год') { headerIdx = i; break; }
  }

  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const msc       = parseInt(row[2]);
    if (msc !== month) continue;

    const payment   = String(row[12]).trim();   // Платеж/поступл
    const direction = String(row[13]).trim();   // Направл
    const activity  = String(row[14]).trim();   // Вид д-ти

    if (payment !== 'Выбытие')        continue;
    if (direction === 'Операция')     continue;
    if (activity  !== 'Операционная') continue;

    const amount  = Math.abs(parseNum(row[4])); // Сумма, тнг (abs)
    const article = String(row[11]).trim();      // Статья

    if (amount === 0) continue;
    totalExpenses += amount;

    if (article.includes('Закупка')) {
      groups['Закупка товара'] += amount;
    } else if (direction === 'Зарплаты') {
      groups['Зарплаты'] += amount;
    } else if (/аренда/i.test(article)) {
      groups['Аренда'] += amount;
    } else if (/маркетинг|реклама|таргет|блогер|съемк|led|модели|витрин|стилист|шопинга|led/i.test(article)) {
      groups['Маркетинг'] += amount;
    } else if (direction === 'Налоги') {
      groups['Налоги'] += amount;
    } else if (/логистика/i.test(article)) {
      groups['Логистика'] += amount;
    } else {
      groups['Прочие'] += amount;
    }
  }

  return { totalExpenses, expensesByGroup: groups };
}

// ═══════════════════ ДИНАМИКА ════════════════════

function buildDynamics(opiuSS, factRaw, currentMonth) {
  const dynamics = { months: [], revenue: [], marginalProfit: [], grossProfit: [] };

  // Revenue из Факт: строка 4 (idx 3), колонки B(1)..M(12)
  const revRow = factRaw ? factRaw[3] : null;

  for (let m = 1; m <= currentMonth; m++) {
    const rev = revRow ? parseNum(revRow[m]) : 0;

    let marg = 0, gross = 0;
    try {
      const sh = opiuSS.getSheetByName(String(m));
      if (sh) {
        const data = sh.getRange('A1:M85').getValues();
        const margRow  = findRow(data, 'Маржинальный доход');
        const grossRow = findRow(data, 'Валовая прибыль по направлениям');
        marg  = parseNum(margRow?.[TOTAL_COL]);
        gross = parseNum(grossRow?.[TOTAL_COL]);
      }
    } catch (e) { /* пропускаем */ }

    dynamics.months.push(m);
    dynamics.revenue.push(rev);
    dynamics.marginalProfit.push(marg);
    dynamics.grossProfit.push(gross);
  }

  return dynamics;
}

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

  var lastRow = sheet.getLastRow();
  var raw = sheet.getRange(1, 1, lastRow, 13).getValues();

  // Определяем строки с объединёнными ячейками по столбцам магазинов (C-K = cols 3-11).
  // getValues() для объединённой ячейки возвращает значение только в top-left ячейке,
  // остальные ячейки merge возвращают пустую строку — что даёт неверные per-store значения.
  var storeMergedRows = {};
  try {
    sheet.getMergedRanges().forEach(function(r) {
      // Merge "по магазинам" — если объединение охватывает col C (3) и минимум col D (4)
      if (r.getColumn() <= 3 && r.getLastColumn() >= 4) {
        for (var ri = r.getRow() - 1; ri <= r.getLastRow() - 1; ri++) {
          storeMergedRows[ri] = true; // 0-based индекс строки
        }
      }
    });
  } catch (e) { /* игнорируем если getMergedRanges недоступен */ }

  var rows = [];
  var currentParent = null;

  // Пропускаем row 0 (заголовок)
  for (var i = 1; i < raw.length; i++) {
    var label = String(raw[i][1]).trim();
    if (!label) continue;

    var isGroup = OPIU_GROUP_LABELS.indexOf(label) !== -1;
    var isMerged = !!storeMergedRows[i];
    // Строки с % в метке (напр. "Рентабельность...%") содержат дробные значения (0.317 = 31.7%),
    // а не суммы в тенге — помечаем флагом для корректного форматирования на фронтенде
    var isPct = label.indexOf('%') !== -1;

    // Собираем значения по всем магазинам + Итого.
    // Для объединённых строк: store values = null (нет побочных данных),
    // только Итого из col M — корректная сумма по компании.
    var values = {};
    var hasNonZero = false;
    for (var j = 0; j < OPIU_ALL_STORE_NAMES.length; j++) {
      var v = isMerged ? null : parseNum(raw[i][OPIU_ALL_COLS[j]]);
      values[OPIU_ALL_STORE_NAMES[j]] = v;
      if (v !== null && v !== 0) hasNonZero = true;
    }
    var totalVal = parseNum(raw[i][TOTAL_COL]);
    values['Итого'] = totalVal;
    if (totalVal !== 0) hasNonZero = true;

    if (isGroup) {
      currentParent = label;
      rows.push({ label: label, type: 'group', parent: null, values: values, merged: isMerged, pct: isPct });
    } else {
      // Показываем все строки с лейблом (пропускаем только строки без лейбла)
      rows.push({ label: label, type: 'item', parent: currentParent, values: values, merged: isMerged, pct: isPct });
    }
  }

  if (rows.length === 0) throw new Error('Нет данных в листе ' + month);

  return {
    month: month,
    stores: OPIU_ALL_STORE_NAMES,
    rows: rows
  };
}
