function doGet() {
  return ContentService.createTextOutput('Sistem Lembur & Cuti siap digunakan.');
}

function doPost(e) {
  try {
    ensureSheets();

    let payload = {};
    if (e.parameter && e.parameter.data) {
      payload = JSON.parse(e.parameter.data);
    } else {
      return jsonResponse({ success: false, message: 'Data tidak ditemukan.' });
    }

    const action = payload.action || '';

    switch (action) {
      case 'login':
        return jsonResponse({ success: true, user: loginUser(payload.username, payload.password) });
      case 'getUsers':
        return jsonResponse({ success: true, users: getUsers() });
      case 'saveUser':
        return jsonResponse({ success: true, user: saveUser(payload) });
      case 'deleteUser':
        return jsonResponse({ success: true, ok: deleteUser(payload.nik) });
      
      // LEMBUR
      case 'getLembur':
        return jsonResponse({ success: true, data: getLembur(payload.nik || '', payload.role || '') });
      case 'saveLemburMultiple':
        return jsonResponse({ success: true, rows: saveLemburMultiple(payload.lemburList) });
      case 'updateLembur':
        return jsonResponse({ success: true, ok: updateLembur(payload) });
      case 'deleteLembur':
        return jsonResponse({ success: true, ok: deleteRowById('Data Lembur', payload.id) });
        
      // PERIJINAN (IJIN/CUTI)
      case 'getPerijinan':
        return jsonResponse({ success: true, data: getPerijinan(payload.nik || '', payload.role || '') });
      case 'savePerijinanMultiple':
        return jsonResponse({ success: true, rows: savePerijinanMultiple(payload.perijinanList) });
      case 'updatePerijinan':
        return jsonResponse({ success: true, ok: updatePerijinan(payload) });
      case 'approvePerijinan':
        return jsonResponse({ success: true, ok: updateStatusPerijinan(payload.id, 'Disetujui', payload.adminUsername) });
      case 'rejectPerijinan':
        return jsonResponse({ success: true, ok: updateStatusPerijinan(payload.id, 'Ditolak', payload.adminUsername) });
      case 'deletePerijinan':
        return jsonResponse({ success: true, ok: deleteRowById('Data Perijinan', payload.id) });
        
      default:
        return jsonResponse({ success: false, message: 'Action tidak valid.' });
    }
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || 'Terjadi error di server.' });
  }
}

function ensureSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  let karyawanSheet = spreadsheet.getSheetByName('Data Karyawan');
  if (!karyawanSheet) {
    karyawanSheet = spreadsheet.insertSheet('Data Karyawan');
    karyawanSheet.appendRow(['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Status', 'CreatedAt']);
    karyawanSheet.appendRow(['admin', 'Admin', 'Administrator', 'admin', '12345', 'admin', 'Aktif', new Date().toISOString()]);
  }

  let lemburSheet = spreadsheet.getSheetByName('Data Lembur');
  if (!lemburSheet) {
    lemburSheet = spreadsheet.insertSheet('Data Lembur');
    lemburSheet.appendRow(['ID', 'NIK', 'Nama', 'Divisi', 'Tanggal', 'Deskripsi', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Catatan', 'Tanggal Input', 'Status', 'UpdatedBy']);
  }

  let perijinanSheet = spreadsheet.getSheetByName('Data Perijinan');
  if (!perijinanSheet) {
    perijinanSheet = spreadsheet.insertSheet('Data Perijinan');
    perijinanSheet.appendRow(['ID', 'NIK', 'Nama', 'Divisi', 'Jenis', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Tanggal Input', 'Status', 'UpdatedBy']);
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function normalizeHeaderName(header) {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase());
}

// Fungsi pembantu agar Google Sheets Date/Time object tidak error menjadi 1899-12-30
function formatCellVal(val) {
  if (val instanceof Date) {
    // Jika format waktu (tahun 1899)
    if (val.getFullYear() === 1899) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
    }
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val || '').trim();
}

function getSheetRows(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0];
  const rows = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const obj = {};
    headers.forEach((header, index) => {
      const key = normalizeHeaderName(header);
      const val = formatCellVal(row[index]);
      obj[key] = val;
    });

    // Auto-normalize alias keys for Lembur
    if (obj.deskripsiPekerjaan && !obj.deskripsi) obj.deskripsi = obj.deskripsiPekerjaan;
    if (obj.pekerjaan && !obj.deskripsi) obj.deskripsi = obj.pekerjaan;
    if (obj.keterangan && !obj.deskripsi) obj.deskripsi = obj.keterangan;
    if (obj.uraian && !obj.deskripsi) obj.deskripsi = obj.uraian;
    if (obj.deskripsi && !obj.deskripsiPekerjaan) obj.deskripsiPekerjaan = obj.deskripsi;

    // Auto-normalize alias keys for Cuti/Perijinan
    if (obj.tglMulai && !obj.tanggalMulai) obj.tanggalMulai = obj.tglMulai;
    if (obj.tglSelesai && !obj.tanggalSelesai) obj.tanggalSelesai = obj.tglSelesai;
    if (obj.keterangan && !obj.alasan) obj.alasan = obj.keterangan;

    rows.push(obj);
  }

  return rows;
}

// ------------- USERS -------------
function loginUser(username, password) {
  const users = getUsers();
  const match = users.find(u => 
    (String(u.username) === String(username) || String(u.nik) === String(username)) 
    && String(u.password) === String(password)
  );
  if (!match) return null;
  return {
    nik: match.nik, nama: match.nama, divisi: match.divisi,
    username: match.username, role: match.role || 'user'
  };
}

function getUsers() {
  const rows = getSheetRows('Data Karyawan');
  return rows
    .filter(u => String(u.nik || '').trim() !== '')
    .map(u => ({
      nik: String(u.nik || '').trim(),
      nama: String(u.nama || '').trim(),
      divisi: String(u.divisi || '').trim(),
      username: String(u.username || '').trim(),
      password: String(u.password || '').trim(),
      role: String(u.role || 'user').trim()
    }));
}

function saveUser(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Karyawan');
  const users = getUsers();
  const targetNIK = String(payload.nik || '').trim();

  const existingIndex = users.findIndex(u => u.nik === targetNIK);
  const row = [targetNIK, payload.nama, payload.divisi, payload.username, payload.password, payload.role, 'Aktif', new Date().toISOString()];

  if (existingIndex >= 0) {
    sheet.getRange(existingIndex + 2, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { nik: targetNIK, nama: payload.nama, divisi: payload.divisi, username: payload.username, role: payload.role };
}

function deleteUser(nik) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Karyawan');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(nik).trim()) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ------------- LEMBUR -------------
function getLembur(nik, role) {
  const rows = getSheetRows('Data Lembur');
  if (role === 'admin') return rows.filter(r => String(r.id).trim() !== '');
  return rows.filter(r => String(r.nik).trim() === String(nik).trim());
}

function saveLemburMultiple(lemburList) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Lembur');
  const rowsData = getSheetRows('Data Lembur');
  const saved = [];

  lemburList.forEach(payload => {
    const id = payload.id || String(Date.now() + Math.floor(Math.random() * 1000));
    const desc = payload.deskripsi || payload.deskripsiPekerjaan || payload.keterangan || payload.pekerjaan || '';
    const row = [
      id, payload.nik, payload.nama, payload.divisi, payload.tanggal, desc,
      payload.jamMulai, payload.jamSelesai, payload.totalJam, payload.catatan || payload.notes || '',
      payload.tanggalInput || new Date().toISOString(), 'Diajukan', payload.updatedBy || ''
    ];

    const matchIndex = rowsData.findIndex(item => String(item.id) === id);
    if (matchIndex >= 0) {
      sheet.getRange(matchIndex + 2, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
    saved.push(row);
  });
  return saved;
}

function updateLembur(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Lembur');
  const values = sheet.getDataRange().getValues();
  const id = String(payload.id);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      if (payload.tanggal !== undefined) sheet.getRange(i + 1, 5).setValue(payload.tanggal);
      if (payload.deskripsi !== undefined) sheet.getRange(i + 1, 6).setValue(payload.deskripsi);
      if (payload.jamMulai !== undefined) sheet.getRange(i + 1, 7).setValue(payload.jamMulai);
      if (payload.jamSelesai !== undefined) sheet.getRange(i + 1, 8).setValue(payload.jamSelesai);
      if (payload.totalJam !== undefined) sheet.getRange(i + 1, 9).setValue(payload.totalJam);
      if (payload.catatan !== undefined) sheet.getRange(i + 1, 10).setValue(payload.catatan);
      if (payload.updatedBy !== undefined) sheet.getRange(i + 1, 13).setValue(payload.updatedBy);
      return true;
    }
  }
  return false;
}

// ------------- PERIJINAN -------------
function getPerijinan(nik, role) {
  const rows = getSheetRows('Data Perijinan');
  if (role === 'admin') return rows.filter(r => String(r.id).trim() !== '');
  return rows.filter(r => String(r.nik).trim() === String(nik).trim());
}

function savePerijinanMultiple(perijinanList) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Perijinan');
  const saved = [];

  perijinanList.forEach(payload => {
    const id = payload.id || String(Date.now() + Math.floor(Math.random() * 1000));
    const row = [
      id, payload.nik, payload.nama, payload.divisi, payload.jenis, 
      payload.tanggalMulai, payload.tanggalSelesai, payload.alasan,
      new Date().toISOString(), 'Diajukan', payload.updatedBy || ''
    ];
    sheet.appendRow(row);
    saved.push(row);
  });
  return saved;
}

function updatePerijinan(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Perijinan');
  const values = sheet.getDataRange().getValues();
  const id = String(payload.id);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      if (payload.jenis !== undefined) sheet.getRange(i + 1, 5).setValue(payload.jenis);
      if (payload.tanggalMulai !== undefined) sheet.getRange(i + 1, 6).setValue(payload.tanggalMulai);
      if (payload.tanggalSelesai !== undefined) sheet.getRange(i + 1, 7).setValue(payload.tanggalSelesai);
      if (payload.alasan !== undefined) sheet.getRange(i + 1, 8).setValue(payload.alasan);
      if (payload.status !== undefined) sheet.getRange(i + 1, 10).setValue(payload.status);
      if (payload.updatedBy !== undefined) sheet.getRange(i + 1, 11).setValue(payload.updatedBy);
      return true;
    }
  }
  return false;
}

function updateStatusPerijinan(id, newStatus, adminUsername) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Perijinan');
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.getRange(i + 1, 10).setValue(newStatus);
      sheet.getRange(i + 1, 11).setValue(adminUsername);
      return true;
    }
  }
  return false;
}

function deleteRowById(sheetName, id) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}