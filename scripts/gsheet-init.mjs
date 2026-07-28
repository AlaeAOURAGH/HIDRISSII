// Finish Google Sheet setup once YOU have created a sheet and shared it with the
// service account (orders@hidrissi.iam.gserviceaccount.com) as Editor.
//
// Usage:  node scripts/gsheet-init.mjs <sheet-id-or-url>
//
// It renames the first tab to "Orders", writes + freezes the header row, appends a
// TEST row to prove writes work, and saves GOOGLE_SHEET_ID into .env.local.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(ROOT, '.env.local');
const HEADERS = ['timestamp', 'name', 'phone', 'city', 'product', 'qty', 'price', 'address', 'note', 'lang'];

const arg = process.argv[2] || '';
const sheetId = (arg.match(/[-\w]{25,}/) || [])[0];
if (!sheetId) { console.error('Pass the Google Sheet URL or ID:  node scripts/gsheet-init.mjs <url>'); process.exit(1); }

// Read creds from .env.local
const envText = readFileSync(ENV, 'utf8');
const getEnv = (k) => (envText.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1] || '';
const email = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL').trim();
const key = getEnv('GOOGLE_PRIVATE_KEY').replace(/^"|"$/g, '').replace(/\\n/g, '\n');

const auth = new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
const sheets = google.sheets({ version: 'v4', auth });

async function main() {
  console.log('Opening sheet', sheetId, '…');
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const first = meta.data.sheets[0].properties;
  console.log('  found tab:', JSON.stringify(first.title));

  const requests = [];
  if (first.title !== 'Orders') {
    requests.push({ updateSheetProperties: { properties: { sheetId: first.sheetId, title: 'Orders' }, fields: 'title' } });
  }
  requests.push({ repeatCell: { range: { sheetId: first.sheetId, startRowIndex: 0, endRowIndex: 1 },
    cell: { userEnteredFormat: { textFormat: { bold: true } } }, fields: 'userEnteredFormat.textFormat.bold' } });
  requests.push({ updateSheetProperties: { properties: { sheetId: first.sheetId, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } });
  await sheets.spreadsheets.batchUpdate({ spreadsheetId: sheetId, requestBody: { requests } });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId, range: 'Orders!A1:J1', valueInputOption: 'RAW', requestBody: { values: [HEADERS] },
  });
  console.log('  tab named "Orders", header row written + frozen');

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId, range: 'Orders!A:J', valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [[new Date().toISOString(), 'TEST - ignore', '0600000000', 'Rabat', 'WATHIUM RS-2', '1', '5990', '-', 'setup test', 'fr']] },
  });
  const read = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Orders!A:J' });
  console.log('  test row appended. Rows in sheet:', (read.data.values || []).length);

  const updated = envText.replace(/^GOOGLE_SHEET_ID=.*$/m, 'GOOGLE_SHEET_ID=' + sheetId);
  writeFileSync(ENV, updated, 'utf8');
  console.log('  saved GOOGLE_SHEET_ID to .env.local');
  console.log('\nDONE. Orders will now be saved to https://docs.google.com/spreadsheets/d/' + sheetId + '/edit');
}

main().catch((e) => {
  const msg = e.errors ? e.errors[0].message : e.message;
  if (/permission|forbidden|not have/i.test(msg)) {
    console.error('\nFAILED (403): the service account cannot access this sheet.');
    console.error('Share the sheet with  ' + email + '  as Editor, then re-run.');
  } else {
    console.error('\nFAILED:', msg);
  }
  process.exit(1);
});
