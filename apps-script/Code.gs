/**
 * INDOSPICY — Bulk Orders API (Google Apps Script)
 *
 * Receives bulk-order submissions from the IndoSpicy website
 * and appends each order as a row in a Google Sheet.
 *
 * Deploy (see apps-script/SETUP.md for full walkthrough):
 *   1. Create a new Google Sheet — copy the long ID from its URL.
 *   2. script.google.com → New project → paste this file.
 *   3. Replace SPREADSHEET_ID below.
 *   4. Deploy → New deployment → Type: Web app
 *      Execute as: Me   |   Who has access: Anyone
 *   5. Copy the Web App URL into js/bulkorder.js (APPS_SCRIPT_URL).
 */

const SPREADSHEET_ID = '1bizhwnBaBCMvVGvktDyVvP4-uu5ipmbaFHwQxsbVUEQ';
const SHEET_NAME = 'Orders';

const HEADERS = [
  'Timestamp',
  'Order ID',
  'Name',
  'Phone',
  'Email',
  'Delivery Date',
  'Delivery Time',
  'Address',
  'Notes',
  'Items',
  'Item Count',
  'Estimated Total (RM)'
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: 'Empty request body' });
    }

    const data = JSON.parse(e.postData.contents);

    const check = validate(data);
    if (!check.ok) return jsonResponse({ success: false, error: check.error });

    const sheet = getOrCreateSheet();
    const orderId = generateOrderId();
    const timestamp = new Date();

    const itemsString = data.items
      .map(function (i) { return i.name + ' x ' + i.qty + ' (RM ' + (i.price * i.qty) + ')'; })
      .join(' | ');

    const itemCount = data.items.reduce(function (s, i) {
      return s + Number(i.qty || 0);
    }, 0);

    sheet.appendRow([
      timestamp,
      orderId,
      data.customer.name,
      data.customer.phone,
      data.customer.email,
      data.delivery.date,
      data.delivery.time,
      data.customer.address,
      data.notes || '',
      itemsString,
      itemCount,
      data.estimatedTotal
    ]);

    return jsonResponse({ success: true, orderId: orderId });
  } catch (err) {
    return jsonResponse({ success: false, error: String(err) });
  }
}

function doGet() {
  return jsonResponse({
    status: 'IndoSpicy Orders API is running',
    timestamp: new Date()
  });
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, HEADERS.length, 160);
  }
  return sheet;
}

function generateOrderId() {
  const stamp = Utilities.formatDate(new Date(), 'GMT+5:30', 'yyyyMMdd-HHmmss');
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'IS-' + stamp + '-' + rand;
}

function validate(data) {
  if (!data || typeof data !== 'object') return { ok: false, error: 'Invalid payload' };
  if (!data.customer || !data.customer.name || !data.customer.phone || !data.customer.email || !data.customer.address) {
    return { ok: false, error: 'Missing customer details' };
  }
  if (!data.delivery || !data.delivery.date || !data.delivery.time) {
    return { ok: false, error: 'Missing delivery date or time' };
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    return { ok: false, error: 'No items in order' };
  }
  return { ok: true };
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
