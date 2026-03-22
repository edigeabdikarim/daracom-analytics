/**
 * Daracom ДДС Дашборд — Google Apps Script endpoint
 * Вызывается через роутинг из dashboard.gs: ?action=dds&month=N
 * Возвращает все строки листа «ДДС: месяц» за указанный месяц
 */

const DDS_SHEET_ID = '171I_chBn4SzuinIL4USP8QI9FL8g1X0MQEwqFwDuscc';

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
