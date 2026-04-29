/**
 * Daracom ДДС Дашборд — Google Apps Script endpoint
 * Вызывается через роутинг из dashboard.gs: ?action=dds&month=N
 * Возвращает все строки листа «ДДС: месяц» за указанный месяц
 */

const DDS_SHEET_ID = '171I_chBn4SzuinIL4USP8QI9FL8g1X0MQEwqFwDuscc';
const NONCASH_BALANCE_SHEET_ID = '1waI5gAZyh6Rz156L7YWQVVXOj5GogPejikuOlSSu3w8';
const NONCASH_BANKS = ['Народный', 'Фридом', 'БЦК', 'Каспий'];
const NONCASH_DIRECTIONS = ['Абайка', 'Восход', 'Есентай', 'Астана', 'ИП Daracom'];

/**
 * Точка входа для ДДС (вызывается из dashboard.gs doGet при ?action=dds)
 */
function doGetDDS(e) {
  try {
    const month = parseInt((e && e.parameter && e.parameter.month) || (new Date().getMonth() + 1));
    if (isNaN(month) || month < 1 || month > 12) throw new Error('Некорректный номер месяца');
    const data = getDDSData(month);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getDDSData(month) {
  const ss = SpreadsheetApp.openById(DDS_SHEET_ID);
  const sheet = ss.getSheetByName('ДДС: месяц');
  if (!sheet) throw new Error('Лист "ДДС: месяц" не найден');

  const allRows = sheet.getDataRange().getValues();

  // Найти заголовочную строку (0-based index 2 = строка 3 в таблице)
  let headerIdx = 2;
  for (let i = 0; i < Math.min(6, allRows.length); i++) {
    const c2 = String(allRows[i][2]);
    if (c2.includes('цифрой') || c2 === 'Мсц (цифрой)') { headerIdx = i; break; }
    if (String(allRows[i][0]) === 'Месяц' && String(allRows[i][1]) === 'Год') { headerIdx = i; break; }
  }

  const rows = [];
  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const r = allRows[i];
    const msc = parseInt(r[2]);
    if (msc !== month) continue;

    // Пропускаем пустые строки
    const amount = parseNumDDS(r[4]);
    if (amount === 0 && !String(r[3]).trim()) continue;

    const dateVal = r[3];
    let dateStr = '';
    if (dateVal instanceof Date) {
      const d = dateVal;
      dateStr = [
        String(d.getDate()).padStart(2, '0'),
        String(d.getMonth() + 1).padStart(2, '0'),
        d.getFullYear()
      ].join('.');
    } else {
      dateStr = String(dateVal).trim();
    }

    rows.push({
      date:         dateStr,
      amount:       amount,                    // отрицательное для Выбытий, положительное для Поступлений
      wallet:       String(r[7]).trim(),
      store:        String(r[8]).trim(),
      counterparty: String(r[9]).trim(),
      purpose:      String(r[10]).trim(),
      article:      String(r[11]).trim(),
      type:         String(r[12]).trim(),       // 'Поступление' / 'Выбытие'
      direction:    String(r[13]).trim(),       // 'Зарплаты' / 'Адм. расходы' / ...
      activity:     String(r[14]).trim()        // 'Операционная' / 'Техническая операция' / ...
    });
  }

  return { month, rows };
}

function parseNumDDS(v) {
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/[\s\u00a0\u202f]+/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Возвращает остатки на начало каждого месяца из листа «ДДС: Сводный»,
 * а также остатки по каждому кошельку и список месяцев с транзакциями.
 * Формат: { monthsWithData: [...], "1": { balance: N, wallets: {...} }, ... }
 */
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

  // ВАЖНО: в листе «ДДС: Сводный» wallet-лейблы повторяются дважды —
  // верхний блок (под «Денег на начало месяца») = снимки НА НАЧАЛО месяца,
  // нижний блок (под «Денег на конец месяца») = снимки НА КОНЕЦ месяца.
  // Берём ТОЛЬКО первое совпадение и стопим сканирование на «Денег на конец
  // месяца», иначе wallet-данные оказываются сдвинуты на месяц вперёд
  // (т.к. end-of-month-N = start-of-month-(N+1)).
  const lastRow = svodny.getLastRow();
  const labelsCol = svodny.getRange(1, 1, lastRow, 1).getValues();

  let balanceRowNum = -1;
  const walletRowNums = {};
  for (let i = 0; i < labelsCol.length; i++) {
    const label = String(labelsCol[i][0]).trim();
    if (label === 'Денег на начало месяца') {
      balanceRowNum = i + 1;
    } else if (label === 'Денег на конец месяца') {
      break; // дальше идёт дубль кошельков с end-of-month значениями — пропускаем
    } else if (WALLET_KEYS.includes(label) && !walletRowNums[label]) {
      walletRowNums[label] = i + 1;
    }
  }

  if (balanceRowNum < 0) throw new Error('Строка "Денег на начало месяца" не найдена');

  const balanceMonths = svodny.getRange(balanceRowNum, 2, 1, 12).getValues()[0];
  const walletMonths = {};
  WALLET_KEYS.forEach(function(key) {
    if (walletRowNums[key]) {
      walletMonths[key] = svodny.getRange(walletRowNums[key], 2, 1, 12).getValues()[0];
    }
  });

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
      wallets[key] = walletMonths[key] ? parseNumDDS(walletMonths[key][i]) : 0;
    });
    result[i + 1] = {
      balance: parseNumDDS(balanceMonths[i]),
      wallets: wallets
    };
  }

  return result;
}

/**
 * Endpoint: ?action=dds_balance
 */
function doGetDDSBalance() {
  try {
    const summary = getDDSBalanceSummary();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: summary }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Парсер денежной строки вида "₸90 581,33" / "1 234.56" → Number
 */
function parseTengeStr(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v)
    .replace(/[₸\s  ]/g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Читает лист «Остатки по безналу» из отдельной таблицы и собирает
 * матрицу остатков по направлениям и банкам.
 * Возвращает объект:
 *   {
 *     directions: ['Абайка', 'Восход', ...],
 *     banks:      ['Народный', 'Фридом', 'БЦК', 'Каспий'],
 *     values:     { 'Абайка': { 'Народный': 90581.33, ... }, ... },
 *     totalsByDirection: { 'Абайка': 1639370.22, ... },
 *     totalsByBank:      { 'Народный': 4220895.55, ... },
 *     grandTotal:        N,
 *     updatedAt:         '2026-04-28T12:00:00Z'
 *   }
 */
function getNoncashBalances() {
  const ss = SpreadsheetApp.openById(NONCASH_BALANCE_SHEET_ID);
  const sheet = ss.getSheetByName('Остатки по безналу');
  if (!sheet) throw new Error('Лист "Остатки по безналу" не найден');

  const data = sheet.getDataRange().getValues();
  const values = {};
  NONCASH_DIRECTIONS.forEach(function(d) {
    values[d] = {};
    NONCASH_BANKS.forEach(function(b) { values[d][b] = 0; });
  });

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const direction = String(row[1] || '').trim();
    const bank = String(row[2] || '').trim();
    if (!direction || !bank) continue;
    if (NONCASH_DIRECTIONS.indexOf(direction) === -1) continue;
    if (NONCASH_BANKS.indexOf(bank) === -1) continue;
    values[direction][bank] = parseTengeStr(row[3]);
  }

  const totalsByDirection = {};
  const totalsByBank = {};
  NONCASH_BANKS.forEach(function(b) { totalsByBank[b] = 0; });
  let grandTotal = 0;

  NONCASH_DIRECTIONS.forEach(function(d) {
    let rowSum = 0;
    NONCASH_BANKS.forEach(function(b) {
      const v = values[d][b] || 0;
      rowSum += v;
      totalsByBank[b] += v;
    });
    totalsByDirection[d] = rowSum;
    grandTotal += rowSum;
  });

  return {
    directions: NONCASH_DIRECTIONS,
    banks: NONCASH_BANKS,
    values: values,
    totalsByDirection: totalsByDirection,
    totalsByBank: totalsByBank,
    grandTotal: grandTotal,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Endpoint: ?action=noncash_balances
 */
function doGetNoncashBalances() {
  try {
    const data = getNoncashBalances();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Парсит ячейку с датой в архиве: либо Date object из Google Sheets,
 * либо строка "dd.mm.yyyy". Возвращает ключ "yyyy-mm" (год-месяц
 * последнего дня = "конец месяца X" = "начало месяца X+1") или null.
 */
function parseEndOfMonthKey(v) {
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    return y + '-' + m;
  }
  const s = String(v || '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return m[3] + '-' + m[2].padStart(2, '0');
}

/**
 * Читает лист «Остатки по безналу (архив)» и собирает остатки безнала
 * на конец каждого закрытого месяца с разбивкой по направлениям.
 *
 * Возвращает:
 *   {
 *     byMonth: {
 *       "2025-12": {
 *         total: 12345678.9,
 *         byDirection: { "Абайка": N, "Восход": N, ... }
 *       },
 *       ...
 *     },
 *     updatedAt: "..."
 *   }
 *
 * Незаполненные/нулевые ячейки игнорируются.
 */
function getNoncashArchive() {
  const ss = SpreadsheetApp.openById(NONCASH_BALANCE_SHEET_ID);
  const sheet = ss.getSheetByName('Остатки по безналу (архив)');
  if (!sheet) throw new Error('Лист "Остатки по безналу (архив)" не найден');

  const data = sheet.getDataRange().getValues();
  const byMonth = {};

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const key = parseEndOfMonthKey(row[0]);
    if (!key) continue;
    const direction = String(row[1] || '').trim();
    const bank = String(row[2] || '').trim();
    if (NONCASH_DIRECTIONS.indexOf(direction) === -1) continue;
    if (NONCASH_BANKS.indexOf(bank) === -1) continue;
    const v = parseTengeStr(row[3]);
    if (v === 0) continue;

    if (!byMonth[key]) {
      byMonth[key] = { total: 0, byDirection: {} };
      NONCASH_DIRECTIONS.forEach(function(d) { byMonth[key].byDirection[d] = 0; });
    }
    byMonth[key].byDirection[direction] += v;
    byMonth[key].total += v;
  }

  return {
    byMonth: byMonth,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Endpoint: ?action=noncash_archive
 */
function doGetNoncashArchive() {
  try {
    const data = getNoncashArchive();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, data: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
