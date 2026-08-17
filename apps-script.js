function doGet() {
  ensureSheets();
  return ContentService.createTextOutput('Warehouse Management System API - Online.');
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
      // AUTH & USERS
      case 'login':
        return jsonResponse({ success: true, user: loginUser(payload.username, payload.password) });
      case 'getUsers':
        return jsonResponse({ success: true, users: getUsers() });
      case 'saveUser':
        return jsonResponse({ success: true, user: saveUser(payload) });
      case 'importUsersBulk':
        return jsonResponse({ success: true, count: importUsersBulk(payload.userList) });
      case 'deleteUser':
        return jsonResponse({ success: true, ok: deleteUser(payload.nik) });

      // SHIFT MASTER & ROSTER
      case 'getShifts':
        return jsonResponse({ success: true, data: getShifts() });
      case 'saveShift':
        return jsonResponse({ success: true, data: saveShift(payload) });
      case 'deleteShift':
        return jsonResponse({ success: true, ok: deleteRowById('Data Shift', payload.id) });
      case 'getRosterShifts':
        return jsonResponse({ success: true, data: getRosterShifts(payload.nik || '', payload.role || '') });
      case 'saveRosterBulk':
        return jsonResponse({ success: true, count: saveRosterBulk(payload.rosterList) });
      case 'deleteRosterShift':
        return jsonResponse({ success: true, ok: deleteRowById('Jadwal Shift', payload.id) });

      // ABSENSI
      case 'getAbsensi':
        return jsonResponse({ success: true, data: getAbsensi(payload.nik || '', payload.role || '') });
      case 'checkInAbsensi':
        return jsonResponse({ success: true, data: checkInAbsensi(payload) });
      case 'checkOutAbsensi':
        return jsonResponse({ success: true, data: checkOutAbsensi(payload) });
      case 'saveAbsensiManual':
        return jsonResponse({ success: true, data: saveAbsensiManual(payload) });
      case 'deleteAbsensi':
        return jsonResponse({ success: true, ok: deleteRowById('Data Absensi', payload.id) });

      // LEMBUR (PRIVAT PER KARYAWAN)
      case 'getLembur':
        return jsonResponse({ success: true, data: getLembur(payload.nik || '', payload.role || '') });
      case 'saveLemburMultiple':
        return jsonResponse({ success: true, rows: saveLemburMultiple(payload.lemburList) });
      case 'updateLembur':
        return jsonResponse({ success: true, ok: updateLembur(payload) });
      case 'deleteLembur':
        return jsonResponse({ success: true, ok: deleteRowById('Data Lembur', payload.id) });

      // PERIJINAN (TRANSPARAN UNTUK SEMUA KARYAWAN WAREHOUSE)
      case 'getPerijinan':
        return jsonResponse({ success: true, data: getPerijinan() });
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

      // KASBON
      case 'getKasbon':
        return jsonResponse({ success: true, data: getKasbon(payload.nik || '', payload.role || '') });
      case 'saveKasbon':
        return jsonResponse({ success: true, data: saveKasbon(payload) });
      case 'deleteKasbon':
        return jsonResponse({ success: true, ok: deleteRowById('Data Kasbon', payload.id) });

      // PAYROLL
      case 'getPayroll':
        return jsonResponse({ success: true, data: getPayroll(payload.nik || '', payload.role || '', payload.periode || '') });
      case 'generateMonthlyPayroll':
        return jsonResponse({ success: true, rows: generateMonthlyPayroll(payload.periode, payload.adminUsername) });
      case 'savePayrollAdjustment':
        return jsonResponse({ success: true, data: savePayrollAdjustment(payload) });
      case 'approvePayroll':
        return jsonResponse({ success: true, ok: approvePayroll(payload.periode, payload.adminUsername) });
      case 'deletePayroll':
        return jsonResponse({ success: true, ok: deleteRowById('Data Payroll', payload.id) });

      default:
        return jsonResponse({ success: false, message: 'Action tidak valid.' });
    }
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || 'Terjadi error di server.' });
  }
}

function ensureSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 1. DATA KARYAWAN (Auto-normalize & Realignment)
  let karyawanSheet = spreadsheet.getSheetByName('Data Karyawan');
  if (!karyawanSheet) {
    karyawanSheet = spreadsheet.insertSheet('Data Karyawan');
    karyawanSheet.appendRow(['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Email', 'NoHP', 'GajiPokok', 'Tunjangan', 'RateLembur', 'SaldoKasbon', 'Status', 'CreatedAt']);
    karyawanSheet.appendRow(['WH0001', 'Admin Warehouse', 'Warehouse', 'admin', '12345', 'admin', '', '', 4500000, 500000, 25000, 0, 'Aktif', new Date().toISOString()]);
  } else {
    normalizeAndFixKaryawanSheet(karyawanSheet);
  }

  // 2. DATA SHIFT MASTER
  let shiftSheet = spreadsheet.getSheetByName('Data Shift');
  if (!shiftSheet) {
    shiftSheet = spreadsheet.insertSheet('Data Shift');
    shiftSheet.appendRow(['ID', 'NamaShift', 'JamMasuk', 'JamPulang', 'ToleransiMenit', 'Status']);
    shiftSheet.appendRow(['SHIFT-1', 'Shift 1', '08:00', '17:00', 15, 'Aktif']);
    shiftSheet.appendRow(['SHIFT-2', 'Shift 2', '09:00', '18:00', 15, 'Aktif']);
    shiftSheet.appendRow(['SHIFT-3', 'Shift 3', '12:00', '21:00', 15, 'Aktif']);
  }

  // 3. JADWAL ROSTER SHIFT KARYAWAN
  let rosterSheet = spreadsheet.getSheetByName('Jadwal Shift');
  if (!rosterSheet) {
    rosterSheet = spreadsheet.insertSheet('Jadwal Shift');
    rosterSheet.appendRow(['ID', 'NIK', 'Nama', 'Tanggal', 'Shift', 'JamMasuk', 'JamPulang', 'Keterangan', 'UpdatedAt']);
  }

  // 4. DATA ABSENSI
  let absensiSheet = spreadsheet.getSheetByName('Data Absensi');
  if (!absensiSheet) {
    absensiSheet = spreadsheet.insertSheet('Data Absensi');
    absensiSheet.appendRow(['ID', 'NIK', 'Nama', 'Tanggal', 'Shift', 'JamMasuk', 'JamPulang', 'Status', 'KeterlambatanMenit', 'Catatan']);
  }

  // 5. DATA LEMBUR
  let lemburSheet = spreadsheet.getSheetByName('Data Lembur');
  if (!lemburSheet) {
    lemburSheet = spreadsheet.insertSheet('Data Lembur');
    lemburSheet.appendRow(['ID', 'NIK', 'Nama', 'Divisi', 'Tanggal', 'Deskripsi', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Catatan', 'Tanggal Input', 'Status', 'UpdatedBy']);
  }

  // 6. DATA PERIJINAN
  let perijinanSheet = spreadsheet.getSheetByName('Data Perijinan');
  if (!perijinanSheet) {
    perijinanSheet = spreadsheet.insertSheet('Data Perijinan');
    perijinanSheet.appendRow(['ID', 'NIK', 'Nama', 'Divisi', 'Jenis', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Tanggal Input', 'Status', 'UpdatedBy']);
  }

  // 7. DATA KASBON
  let kasbonSheet = spreadsheet.getSheetByName('Data Kasbon');
  if (!kasbonSheet) {
    kasbonSheet = spreadsheet.insertSheet('Data Kasbon');
    kasbonSheet.appendRow(['ID', 'NIK', 'Nama', 'TanggalPengajuan', 'JumlahPinjaman', 'CicilanPerBulan', 'SisaKasbon', 'Status', 'Catatan']);
  }

  // 8. DATA PAYROLL
  let payrollSheet = spreadsheet.getSheetByName('Data Payroll');
  if (!payrollSheet) {
    payrollSheet = spreadsheet.insertSheet('Data Payroll');
    payrollSheet.appendRow(['ID', 'Periode', 'NIK', 'Nama', 'Divisi', 'GajiPokok', 'Tunjangan', 'TotalJamLembur', 'RateLembur', 'TotalUangLembur', 'PotonganKasbon', 'PotonganAbsensi', 'PotonganLain', 'GajiBersih', 'Status', 'Catatan', 'UpdatedBy', 'CreatedAt']);
  }
}

/**
 * Otomatis memperbaiki pergeseran kolom (misaligned columns) pada Data Karyawan
 */
function normalizeAndFixKaryawanSheet(sheet) {
  const standardHeaders = ['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Email', 'NoHP', 'GajiPokok', 'Tunjangan', 'RateLembur', 'SaldoKasbon', 'Status', 'CreatedAt'];
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return;

  const currentHeaders = values[0].map(h => String(h).trim().toLowerCase());
  
  // Deteksi apakah ada pergeseran kolom (misal kolom G berisi 'status aktif' atau email berisi angka gaji)
  const isShifted = currentHeaders.includes('status aktif') || 
                    currentHeaders.indexOf('email') > 6 || 
                    (values.length > 1 && String(values[1][currentHeaders.indexOf('email')]).match(/^[0-9]{5,}$/));

  if (isShifted) {
    const cleanedRows = [standardHeaders];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const nik = String(row[0] || '').trim();
      if (!nik) continue;

      let nama = String(row[1] || '').trim();
      let divisi = String(row[2] || 'Warehouse').trim();
      let username = String(row[3] || nik).trim();
      let password = String(row[4] || '12345').trim();
      let role = String(row[5] || 'user').trim();

      // Periksa apakah data lama bergeser 2 kolom ke kanan (karena adanya kolom 'status aktif' dan blank)
      let email = '';
      let noHp = '';
      let gajiPokok = 0;
      let tunjangan = 0;
      let rateLembur = 25000;
      let saldoKasbon = 0;
      let status = 'Aktif';
      let createdAt = new Date().toISOString();

      if (row.length > 8 && !isNaN(Number(row[8])) && Number(row[8]) > 100000) {
        email = (String(row[6] || '').includes('@')) ? String(row[6]).trim() : '';
        noHp = (String(row[7] || '').startsWith('0') || String(row[7] || '').startsWith('62') || String(row[7] || '').startsWith('8')) ? String(row[7]).trim() : '';
        gajiPokok = Number(row[8] || 0);
        tunjangan = Number(row[9] || 0);
        rateLembur = Number(row[10] || 25000);
        saldoKasbon = Number(row[11] || 0);
        status = String(row[12] || 'Aktif').trim();
        createdAt = formatCellVal(row[13]) || new Date().toISOString();
      } else {
        email = String(row[6] || '').trim();
        noHp = String(row[7] || '').trim();
        gajiPokok = Number(row[8] || 0);
        tunjangan = Number(row[9] || 0);
        rateLembur = Number(row[10] || 25000);
        saldoKasbon = Number(row[11] || 0);
        status = String(row[12] || 'Aktif').trim();
        createdAt = formatCellVal(row[13]) || new Date().toISOString();
      }

      cleanedRows.push([
        nik, nama, divisi, username, password, role,
        email, noHp, gajiPokok, tunjangan, rateLembur, saldoKasbon, status, createdAt
      ]);
    }

    // Bersihkan sheet dan timpa dengan susunan kolom standar yang rapi
    sheet.clear();
    sheet.getRange(1, 1, cleanedRows.length, standardHeaders.length).setValues(cleanedRows);
  } else {
    // Pastikan header lengkap
    ensureHeaders(sheet, standardHeaders);
  }
}

function ensureHeaders(sheet, expectedHeaders) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim().toLowerCase());
  
  expectedHeaders.forEach(expected => {
    const norm = expected.toLowerCase();
    if (!currentHeaders.includes(norm)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(expected);
    }
  });
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

function formatCellVal(val) {
  if (val instanceof Date) {
    if (val.getFullYear() === 1899) {
      return Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
    }
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(val !== undefined && val !== null ? val : '').trim();
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

    if (obj.deskripsiPekerjaan && !obj.deskripsi) obj.deskripsi = obj.deskripsiPekerjaan;
    if (obj.pekerjaan && !obj.deskripsi) obj.deskripsi = obj.pekerjaan;
    if (obj.keterangan && !obj.deskripsi) obj.deskripsi = obj.keterangan;
    if (obj.uraian && !obj.deskripsi) obj.deskripsi = obj.uraian;
    if (obj.deskripsi && !obj.deskripsiPekerjaan) obj.deskripsiPekerjaan = obj.deskripsi;

    if (obj.tglMulai && !obj.tanggalMulai) obj.tanggalMulai = obj.tglMulai;
    if (obj.tglSelesai && !obj.tanggalSelesai) obj.tanggalSelesai = obj.tglSelesai;
    if (obj.keterangan && !obj.alasan) obj.alasan = obj.keterangan;

    if (obj.noTelepon && !obj.noHp) obj.noHp = obj.noTelepon;
    if (obj.telepon && !obj.noHp) obj.noHp = obj.telepon;
    if (obj.hp && !obj.noHp) obj.noHp = obj.hp;
    if (obj.nohp && !obj.noHp) obj.noHp = obj.nohp;

    rows.push(obj);
  }

  return rows;
}

// ------------- USERS -------------
function loginUser(username, password) {
  const users = getUsers();
  const match = users.find(u => 
    (String(u.username).toLowerCase() === String(username).toLowerCase() || String(u.nik).toLowerCase() === String(username).toLowerCase()) 
    && String(u.password) === String(password)
  );
  if (!match) return null;
  return {
    nik: match.nik, nama: match.nama, divisi: match.divisi,
    username: match.username, role: match.role || 'user',
    email: match.email || '', noHp: match.noHp || match.nohp || '',
    gajiPokok: match.gajiPokok || 0, tunjangan: match.tunjangan || 0, rateLembur: match.rateLembur || 0
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
      role: String(u.role || 'user').trim(),
      email: String(u.email || '').trim(),
      noHp: String(u.noHp || u.nohp || u.telepon || u.hp || '').trim(),
      gajiPokok: Number(u.gajiPokok || 0),
      tunjangan: Number(u.tunjangan || 0),
      rateLembur: Number(u.rateLembur || 0),
      saldoKasbon: Number(u.saldoKasbon || 0)
    }));
}

function saveUser(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Karyawan');
  const values = sheet.getDataRange().getValues();
  const targetNIK = String(payload.nik || '').trim();

  let existingRowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetNIK) {
      existingRowIndex = i + 1;
      break;
    }
  }

  const rowData = [
    targetNIK, 
    payload.nama || '', 
    payload.divisi || 'Warehouse', 
    payload.username || targetNIK, 
    payload.password || '12345', 
    payload.role || 'user', 
    payload.email || '', 
    payload.noHp || payload.nohp || '',
    Number(payload.gajiPokok || 0),
    Number(payload.tunjangan || 0),
    Number(payload.rateLembur || 25000),
    Number(payload.saldoKasbon || 0),
    'Aktif', 
    new Date().toISOString()
  ];

  if (existingRowIndex > 0) {
    sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { 
    nik: targetNIK, 
    nama: payload.nama, 
    divisi: payload.divisi, 
    username: payload.username, 
    role: payload.role,
    email: payload.email,
    noHp: payload.noHp,
    gajiPokok: payload.gajiPokok,
    tunjangan: payload.tunjangan,
    rateLembur: payload.rateLembur,
    saldoKasbon: payload.saldoKasbon
  };
}

function importUsersBulk(userList) {
  if (!userList || !userList.length) return 0;
  userList.forEach(u => saveUser(u));
  return userList.length;
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

// ------------- SHIFT MASTER -------------
function getShifts() {
  const rows = getSheetRows('Data Shift');
  return rows.filter(s => String(s.id || '').trim() !== '');
}

function saveShift(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Shift');
  const id = payload.id || 'SHIFT-' + Date.now();
  const rowData = [
    id, 
    payload.namaShift || '', 
    payload.jamMasuk || '', 
    payload.jamPulang || '', 
    Number(payload.toleransiMenit || 15), 
    payload.status || 'Aktif'
  ];

  const values = sheet.getDataRange().getValues();
  let matchIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) { matchIndex = i + 1; break; }
  }

  if (matchIndex > 0) {
    sheet.getRange(matchIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { id, ...payload };
}

// ------------- JADWAL ROSTER SHIFT KARYAWAN -------------
function getRosterShifts(nik, role) {
  const rows = getSheetRows('Jadwal Shift');
  if (role === 'admin') return rows.filter(r => String(r.id || '').trim() !== '');
  return rows.filter(r => String(r.nik).trim() === String(nik).trim());
}

function saveRosterBulk(rosterList) {
  if (!rosterList || !rosterList.length) return 0;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Jadwal Shift');
  const existing = getSheetRows('Jadwal Shift');

  rosterList.forEach(item => {
    const nik = String(item.nik || '').trim();
    const tgl = String(item.tanggal || '').trim();
    const id = `ROSTER-${nik}-${tgl}`;
    const row = [
      id,
      nik,
      item.nama || '',
      tgl,
      item.shift || 'Shift 1',
      item.jamMasuk || '08:00',
      item.jamPulang || '17:00',
      item.keterangan || '',
      new Date().toISOString()
    ];

    const matchIndex = existing.findIndex(r => r.id === id);
    if (matchIndex >= 0) {
      sheet.getRange(matchIndex + 2, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  });

  return rosterList.length;
}

// ------------- ABSENSI -------------
function getAbsensi(nik, role) {
  const rows = getSheetRows('Data Absensi');
  if (role === 'admin') return rows.filter(r => String(r.id || '').trim() !== '');
  return rows.filter(r => String(r.nik).trim() === String(nik).trim());
}

function checkInAbsensi(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Absensi');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  const rows = getSheetRows('Data Absensi');

  const existing = rows.find(r => String(r.nik).trim() === String(payload.nik).trim() && String(r.tanggal) === today);
  if (existing) {
    throw new Error('Anda sudah melakukan presensi masuk hari ini pada pukul ' + existing.jamMasuk);
  }

  const id = 'ABS-' + Date.now();
  const shiftName = payload.shift || 'Shift 1';
  let keterlambatan = 0;
  let status = 'Hadir';

  if (payload.shiftJamMasuk) {
    const [smH, smM] = payload.shiftJamMasuk.split(':').map(Number);
    const [curH, curM] = currentTime.split(':').map(Number);
    const scheduledMinutes = smH * 60 + smM + Number(payload.toleransi || 15);
    const currentMinutes = curH * 60 + curM;
    if (currentMinutes > scheduledMinutes) {
      keterlambatan = currentMinutes - (smH * 60 + smM);
      status = 'Terlambat';
    }
  }

  const row = [id, payload.nik, payload.nama, today, shiftName, currentTime, '', status, keterlambatan, payload.catatan || ''];
  sheet.appendRow(row);
  return { id, nik: payload.nik, tanggal: today, jamMasuk: currentTime, status, keterlambatan };
}

function checkOutAbsensi(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Absensi');
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const currentTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm');
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const rowNik = String(values[i][1]).trim();
    const rowDate = formatCellVal(values[i][3]);
    if (rowNik === String(payload.nik).trim() && rowDate === today) {
      sheet.getRange(i + 1, 7).setValue(currentTime);
      return { ok: true, jamPulang: currentTime };
    }
  }
  throw new Error('Belum ada data presensi masuk untuk hari ini.');
}

function saveAbsensiManual(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Absensi');
  const id = payload.id || 'ABS-' + Date.now();
  const row = [
    id, payload.nik, payload.nama, payload.tanggal, payload.shift || 'Normal',
    payload.jamMasuk || '', payload.jamPulang || '', payload.status || 'Hadir',
    Number(payload.keterlambatanMenit || 0), payload.catatan || ''
  ];
  sheet.appendRow(row);
  return { id, ...payload };
}

// ------------- LEMBUR (PRIVAT PER USER) -------------
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

// ------------- PERIJINAN (TRANSPARAN SEMUA KARYAWAN) -------------
function getPerijinan() {
  const rows = getSheetRows('Data Perijinan');
  return rows.filter(r => String(r.id).trim() !== '');
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

  notifyAdminNewLeave(perijinanList);
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
      
      if (payload.status && payload.status !== 'Diajukan') {
        notifyEmployeeLeaveStatus(id, payload.status, payload.updatedBy);
      }
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
      notifyEmployeeLeaveStatus(id, newStatus, adminUsername);
      return true;
    }
  }
  return false;
}

// ------------- KASBON KARYAWAN -------------
function getKasbon(nik, role) {
  const rows = getSheetRows('Data Kasbon');
  if (role === 'admin') return rows.filter(r => String(r.id || '').trim() !== '');
  return rows.filter(r => String(r.nik).trim() === String(nik).trim());
}

function saveKasbon(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Kasbon');
  const id = payload.id || 'KSB-' + Date.now();
  const pinjaman = Number(payload.jumlahPinjaman || 0);
  const cicilan = Number(payload.cicilanPerBulan || 0);
  const sisa = payload.sisaKasbon !== undefined ? Number(payload.sisaKasbon) : pinjaman;

  const row = [
    id, payload.nik, payload.nama, 
    payload.tanggalPengajuan || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    pinjaman, cicilan, sisa, payload.status || 'Aktif', payload.catatan || ''
  ];

  const values = sheet.getDataRange().getValues();
  let matchIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) { matchIndex = i + 1; break; }
  }

  if (matchIndex > 0) {
    sheet.getRange(matchIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  updateKaryawanKasbonBalance(payload.nik);
  return { id, ...payload };
}

function updateKaryawanKasbonBalance(nik) {
  const kasbonRows = getSheetRows('Data Kasbon').filter(k => String(k.nik).trim() === String(nik).trim() && k.status === 'Aktif');
  const totalSisa = kasbonRows.reduce((acc, curr) => acc + Number(curr.sisaKasbon || 0), 0);

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Karyawan');
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(nik).trim()) {
      sheet.getRange(i + 1, 12).setValue(totalSisa);
      break;
    }
  }
}

// ------------- PAYROLL GENERATOR & AUDIT -------------
function getPayroll(nik, role, periode) {
  const rows = getSheetRows('Data Payroll');
  let filtered = rows;
  if (periode) filtered = filtered.filter(r => r.periode === periode);
  if (role !== 'admin') filtered = filtered.filter(r => String(r.nik).trim() === String(nik).trim());
  return filtered;
}

function generateMonthlyPayroll(periode, adminUsername) {
  if (!periode) throw new Error('Periode bulan dan tahun wajib diisi (Contoh: 2026-08)');
  
  const users = getUsers().filter(u => u.nik !== 'admin');
  const lemburRows = getSheetRows('Data Lembur');
  const kasbonRows = getSheetRows('Data Kasbon');
  const payrollSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Payroll');
  const existingPayroll = getSheetRows('Data Payroll');

  const results = [];

  users.forEach(user => {
    const userLembur = lemburRows.filter(l => {
      if (String(l.nik).trim() !== String(user.nik).trim()) return false;
      const tgl = String(l.tanggal || '');
      return tgl.startsWith(periode);
    });

    let totalJamLembur = 0;
    userLembur.forEach(l => {
      const jamStr = String(l.totalJam || '').replace(/[^0-9.]/g, '');
      totalJamLembur += Number(jamStr || 0);
    });

    const rateLembur = Number(user.rateLembur || 25000);
    const totalUangLembur = Math.round(totalJamLembur * rateLembur);

    const activeKasbon = kasbonRows.filter(k => String(k.nik).trim() === String(user.nik).trim() && k.status === 'Aktif');
    let potonganKasbon = 0;
    activeKasbon.forEach(k => {
      const cicil = Number(k.cicilanPerBulan || 0);
      const sisa = Number(k.sisaKasbon || 0);
      potonganKasbon += Math.min(cicil, sisa);
    });

    const gajiPokok = Number(user.gajiPokok || 0);
    const tunjangan = Number(user.tunjangan || 0);
    const potonganAbsensi = 0;
    const potonganLain = 0;
    const gajiBersih = (gajiPokok + tunjangan + totalUangLembur) - (potonganKasbon + potonganAbsensi + potonganLain);

    const id = `PAY-${periode}-${user.nik}`;
    const row = [
      id, periode, user.nik, user.nama, user.divisi,
      gajiPokok, tunjangan, Number(totalJamLembur.toFixed(2)), rateLembur, totalUangLembur,
      potonganKasbon, potonganAbsensi, potonganLain, gajiBersih,
      'Draft', '', adminUsername || 'Admin', new Date().toISOString()
    ];

    const matchIdx = existingPayroll.findIndex(p => p.id === id);
    if (matchIdx >= 0) {
      payrollSheet.getRange(matchIdx + 2, 1, 1, row.length).setValues([row]);
    } else {
      payrollSheet.appendRow(row);
    }
    results.push(row);
  });

  return results;
}

function savePayrollAdjustment(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Payroll');
  const values = sheet.getDataRange().getValues();
  const id = String(payload.id);

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === id) {
      const gPokok = Number(payload.gajiPokok || values[i][5]);
      const tunjangan = Number(payload.tunjangan || values[i][6]);
      const jamLembur = Number(payload.totalJamLembur || values[i][7]);
      const rateLembur = Number(payload.rateLembur || values[i][8]);
      const uangLembur = Math.round(jamLembur * rateLembur);

      const potKasbon = Number(payload.potonganKasbon || values[i][10]);
      const potAbsen = Number(payload.potonganAbsensi || values[i][11]);
      const potLain = Number(payload.potonganLain || values[i][12]);

      const gBersih = (gPokok + tunjangan + uangLembur) - (potKasbon + potAbsen + potLain);

      sheet.getRange(i + 1, 6).setValue(gPokok);
      sheet.getRange(i + 1, 7).setValue(tunjangan);
      sheet.getRange(i + 1, 8).setValue(jamLembur);
      sheet.getRange(i + 1, 9).setValue(rateLembur);
      sheet.getRange(i + 1, 10).setValue(uangLembur);
      sheet.getRange(i + 1, 11).setValue(potKasbon);
      sheet.getRange(i + 1, 12).setValue(potAbsen);
      sheet.getRange(i + 1, 13).setValue(potLain);
      sheet.getRange(i + 1, 14).setValue(gBersih);
      if (payload.catatan !== undefined) sheet.getRange(i + 1, 16).setValue(payload.catatan);
      sheet.getRange(i + 1, 17).setValue(payload.updatedBy || 'Admin');
      return { ok: true, gajiBersih: gBersih };
    }
  }
  throw new Error('Data payroll tidak ditemukan.');
}

function approvePayroll(periode, adminUsername) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Payroll');
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === periode) {
      sheet.getRange(i + 1, 15).setValue('Disetujui');
      sheet.getRange(i + 1, 17).setValue(adminUsername);
    }
  }
  return true;
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

// ------------- NOTIFIKASI EMAIL OTOMATIS -------------
function notifyAdminNewLeave(perijinanList) {
  try {
    if (!perijinanList || !perijinanList.length) return;
    const users = getUsers();
    const adminEmails = users
      .filter(u => u.role === 'admin' && u.email && u.email.includes('@'))
      .map(u => u.email.trim());

    if (!adminEmails.length) return;

    const summaryList = perijinanList.map(p => `
      <li style="margin-bottom: 8px;">
        <strong>${p.nama} (${p.nik})</strong> - <em>${p.jenis}</em><br/>
        📅 Periode: <strong>${p.tanggalMulai} s/d ${p.tanggalSelesai}</strong><br/>
        📝 Alasan: ${p.alasan}
      </li>
    `).join('');

    const subject = `[Warehouse Management] Pengajuan Ijin / Cuti Baru: ${perijinanList[0].nama}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #d0d7de; border-radius: 10px; background-color: #ffffff; color: #1f2328;">
        <h3 style="color: #0969da; margin-top: 0;">⚡ Notifikasi Pengajuan Ijin / Cuti</h3>
        <p>Halo Admin,</p>
        <p>Terdapat pengajuan Ijin / Cuti baru di Warehouse yang memerlukan review & persetujuan:</p>
        <ul style="padding-left: 20px; background: #f6f8fa; padding: 16px 20px; border-radius: 8px; border: 1px solid #e1e4e8;">
          ${summaryList}
        </ul>
        <p style="margin-top: 20px;">Silakan login ke web <strong>Warehouse Management</strong> untuk melakukan persetujuan (Approve / Reject).</p>
        <hr style="border: 0; border-top: 1px solid #d0d7de; margin: 20px 0;" />
        <small style="color: #6e7681;">Sistem Otomatis Notifikasi Warehouse Management</small>
      </div>
    `;

    MailApp.sendEmail({
      to: adminEmails.join(','),
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log('Gagal mengirim email ke admin: ' + err.message);
  }
}

function notifyEmployeeLeaveStatus(id, newStatus, adminUsername) {
  try {
    const perijinanRows = getSheetRows('Data Perijinan');
    const item = perijinanRows.find(r => String(r.id) === String(id));
    if (!item) return;

    const users = getUsers();
    const employee = users.find(u => String(u.nik).trim() === String(item.nik).trim());
    if (!employee || !employee.email || !employee.email.includes('@')) return;

    const isApproved = newStatus === 'Disetujui';
    const statusColor = isApproved ? '#1a7f37' : '#cf222e';
    const statusIcon = isApproved ? '✅' : '❌';

    const subject = `[Warehouse Management] ${statusIcon} Status Ijin/Cuti Anda: ${newStatus}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #d0d7de; border-radius: 10px; background-color: #ffffff; color: #1f2328;">
        <h3 style="color: ${statusColor}; margin-top: 0;">${statusIcon} Pengajuan Ijin / Cuti ${newStatus}</h3>
        <p>Halo <strong>${employee.nama}</strong>,</p>
        <p>Pengajuan perijinan Anda telah diperbarui statusnya:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f6f8fa; border-radius: 8px;">
          <tr><td style="padding: 8px 12px; font-weight: bold; width: 140px;">Jenis:</td><td style="padding: 8px 12px;">${item.jenis}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Periode:</td><td style="padding: 8px 12px;">${item.tanggalMulai} s/d ${item.tanggalSelesai}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Alasan:</td><td style="padding: 8px 12px;">${item.alasan || '-'}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Status:</td><td style="padding: 8px 12px; font-weight: bold; color: ${statusColor};">${newStatus}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Diupdate Oleh:</td><td style="padding: 8px 12px;">${adminUsername || 'Admin'}</td></tr>
        </table>
        <p>Terima kasih telah menggunakan sistem Warehouse Management.</p>
        <hr style="border: 0; border-top: 1px solid #d0d7de; margin: 20px 0;" />
        <small style="color: #6e7681;">Sistem Otomatis Notifikasi Warehouse Management</small>
      </div>
    `;

    MailApp.sendEmail({
      to: employee.email.trim(),
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log('Gagal mengirim email ke karyawan: ' + err.message);
  }
}