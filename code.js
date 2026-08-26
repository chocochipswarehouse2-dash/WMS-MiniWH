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
      case 'saveUserProfile':
        return jsonResponse({ success: true, result: saveUserProfile(payload) });
      case 'getProfileRequests':
        return jsonResponse({ success: true, data: getProfileRequests() });
      case 'submitProfileChangeRequest':
        return jsonResponse({ success: true, data: submitProfileChangeRequest(payload) });
      case 'approveProfileChangeRequest':
        return jsonResponse({ success: true, data: approveProfileChangeRequest(payload) });
      case 'rejectProfileChangeRequest':
        return jsonResponse({ success: true, data: rejectProfileChangeRequest(payload) });
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
      case 'updateAbsensi':
        return jsonResponse({ success: true, ok: updateAbsensi(payload) });
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

  // 1. DATA KARYAWAN (Auto-fix & normalize)
  let karyawanSheet = spreadsheet.getSheetByName('Data Karyawan');
  if (!karyawanSheet) {
    karyawanSheet = spreadsheet.insertSheet('Data Karyawan');
    karyawanSheet.appendRow(['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Email', 'NoHP', 'GajiPokok', 'Tunjangan', 'RateLembur', 'SaldoKasbon', 'Status', 'CreatedAt']);
    karyawanSheet.appendRow(['WH0001', 'Effendy', 'Warehouse', 'Admin', '00000', 'admin', '', '', 4500000, 500000, 25000, 0, 'Aktif', new Date().toISOString()]);
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
 * Normalisasi dan Perbaikan Struktur Sheet Data Karyawan
 */
function normalizeAndFixKaryawanSheet(sheet) {
  const standardHeaders = ['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Email', 'NoHP', 'GajiPokok', 'Tunjangan', 'RateLembur', 'SaldoKasbon', 'Status', 'CreatedAt'];
  const values = sheet.getDataRange().getValues();
  if (values.length < 1) return;

  const rawHeaders = values[0].map(h => String(h || '').trim());
  const normHeaders = rawHeaders.map(h => normalizeHeaderName(h));

  const cleanedRows = [standardHeaders];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const nik = String(row[0] || '').trim();
    if (!nik) continue;

    // Buat lookup object berdasarkan nama header yang ada
    const obj = {};
    normHeaders.forEach((key, colIdx) => {
      if (key) obj[key] = row[colIdx];
    });

    const nama = String(obj.nama || row[1] || '').trim();
    const divisi = String(obj.divisi || row[2] || 'Warehouse').trim();
    const username = String(obj.username || row[3] || nik).trim();
    
    let password = String(obj.password !== undefined ? obj.password : (row[4] || '')).trim();
    let role = String(obj.role || row[5] || 'user').trim();

    // Perbaikan jika password dan role menyatu di satu cell (misal '12345 user')
    if ((!password || password === '') && role.includes(' ')) {
      const parts = role.split(/\s+/);
      password = parts[0];
      role = parts[1] || 'user';
    }
    if (!password) password = '12345';

    let email = String(obj.email || row[6] || '').trim();
    let noHp = String(obj.noHp || obj.noHP || obj.nohp || obj.telepon || obj.hp || row[7] || '').trim();

    // Jika email berisi angka murni (>10000), kemungkinan itu adalah gaji pokok yang bergeser
    let gajiPokok = Number(obj.gajiPokok || obj.gajipokok || obj.gajpokok || obj.gapok || obj.gaji || row[8] || 0);
    if ((!gajiPokok || gajiPokok === 0) && !isNaN(Number(email)) && Number(email) > 100000) {
      gajiPokok = Number(email);
      email = '';
    }

    let tunjangan = Number(obj.tunjangan || row[9] || 0);
    let rateLembur = Number(obj.rateLembur || obj.ratelembur || obj.rate || obj.lembur || row[10] || 0);
    if (!rateLembur || rateLembur === 0) {
      rateLembur = 10000; // default jika 0
    }

    let saldoKasbon = Number(obj.saldoKasbon || obj.saldokasbon || obj.kasbon || row[11] || 0);
    let status = String(obj.status || row[12] || 'Aktif').trim();
    let createdAt = formatCellVal(obj.createdAt || obj.createdat || row[13]) || new Date().toISOString();

    cleanedRows.push([
      nik, nama, divisi, username, password, role,
      email, noHp, gajiPokok, tunjangan, rateLembur, saldoKasbon, status, createdAt
    ]);
  }

  // Tulis ulang ke sheet dengan header dan baris yang sudah bersih & terstandarisasi
  sheet.clear();
  sheet.getRange(1, 1, cleanedRows.length, standardHeaders.length).setValues(cleanedRows);
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
  const s = String(header || '').trim();
  if (!s) return '';
  // Split on non-alphanumeric separators (space, underscore, etc.)
  const parts = s.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  return parts.map((part, i) => {
    if (!part) return '';
    if (i === 0) {
      // All-uppercase token (NIK, ID) → all lowercase; others → first char lowercase
      return (part.length > 1 && part === part.toUpperCase())
        ? part.toLowerCase()
        : part.charAt(0).toLowerCase() + part.slice(1);
    }
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join('');
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

    // Auto-normalize alias keys for Gaji Pokok & Rate Lembur
    if (obj.gajpokok && !obj.gajiPokok) obj.gajiPokok = obj.gajpokok;
    if (obj.gajipokok && !obj.gajiPokok) obj.gajiPokok = obj.gajipokok;
    if (obj.gapok && !obj.gajiPokok) obj.gajiPokok = obj.gapok;
    if (obj.gaji && !obj.gajiPokok) obj.gajiPokok = obj.gaji;

    if (obj.ratelembur && !obj.rateLembur) obj.rateLembur = obj.ratelembur;
    if (obj.rate && !obj.rateLembur) obj.rateLembur = obj.rate;
    if (obj.lembur && !obj.rateLembur) obj.rateLembur = obj.lembur;

    if (obj.saldokasbon && !obj.saldoKasbon) obj.saldoKasbon = obj.saldokasbon;
    if (obj.kasbon && !obj.saldoKasbon) obj.saldoKasbon = obj.kasbon;

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
    email: match.email || '', noHp: match.noHp || '',
    alamat: match.alamat || '', tglLahir: match.tglLahir || '',
    tglBergabung: match.tglBergabung || '', foto: match.foto || '',
    hobi: match.hobi || '', kontakDarurat: match.kontakDarurat || '',
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
      alamat: String(u.alamat || '').trim(),
      tglLahir: String(u.tglLahir || u.tgllahir || u.tanggalLahir || '').trim(),
      tglBergabung: String(u.tglBergabung || u.tglbergabung || u.tanggalBergabung || '').trim(),
      foto: String(u.foto || u.fotoUrl || '').trim(),
      hobi: String(u.hobi || '').trim(),
      kontakDarurat: String(u.kontakDarurat || u.kontakdarurat || '').trim(),
      gajiPokok: Number(u.gajiPokok || u.gajpokok || u.gajipokok || u.gapok || 0),
      tunjangan: Number(u.tunjangan || 0),
      rateLembur: Number(u.rateLembur || u.ratelembur || 25000),
      saldoKasbon: Number(u.saldoKasbon || u.saldokasbon || 0)
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
    payload.alamat || '',
    payload.tglLahir || '',
    payload.tglBergabung || '',
    payload.hobi || '',
    payload.kontakDarurat || '',
    payload.foto || '',
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
    alamat: payload.alamat,
    tglLahir: payload.tglLahir,
    tglBergabung: payload.tglBergabung,
    foto: payload.foto,
    hobi: payload.hobi,
    kontakDarurat: payload.kontakDarurat,
    gajiPokok: payload.gajiPokok,
    tunjangan: payload.tunjangan,
    rateLembur: payload.rateLembur,
    saldoKasbon: payload.saldoKasbon
  };
}

function saveUserProfile(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Karyawan');
  const values = sheet.getDataRange().getValues();
  const targetNIK = String(payload.nik || '').trim();
  if (!targetNIK) throw new Error('NIK tidak valid.');

  const headers = values[0].map(h => normalizeHeaderName(h));
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetNIK) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex === -1) throw new Error('Karyawan tidak ditemukan.');

  const updateCol = (colKey, val) => {
    const colIdx = headers.indexOf(colKey);
    if (colIdx >= 0) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(val);
    }
  };

  if (payload.nama !== undefined) updateCol('nama', payload.nama);
  if (payload.email !== undefined) updateCol('email', payload.email);
  if (payload.noHp !== undefined) updateCol('noHP', payload.noHp);
  if (payload.alamat !== undefined) updateCol('alamat', payload.alamat);
  if (payload.tglLahir !== undefined) updateCol('tglLahir', payload.tglLahir);
  if (payload.tglBergabung !== undefined) updateCol('tglBergabung', payload.tglBergabung);
  if (payload.foto !== undefined) updateCol('foto', payload.foto);
  if (payload.hobi !== undefined) updateCol('hobi', payload.hobi);
  if (payload.kontakDarurat !== undefined) updateCol('kontakDarurat', payload.kontakDarurat);

  return { success: true, message: 'Data diri berhasil disimpan.' };
}

function getProfileRequests() {
  return getSheetRows('Pengajuan Profil');
}

function submitProfileChangeRequest(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Pengajuan Profil');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Pengajuan Profil');
    sheet.appendRow(['ID', 'NIK', 'Nama Lama', 'Nama Baru', 'No HP Baru', 'Email Baru', 'Tgl Lahir Baru', 'Alamat Baru', 'Hobi Baru', 'Kontak Darurat Baru', 'Alasan', 'Status', 'Tanggal', 'Created At']);
  }
  const id = payload.id || ('REQ-' + Date.now());
  sheet.appendRow([
    id,
    payload.nik || '',
    payload.namaLama || '',
    payload.namaBaru || '',
    payload.noHpBaru || '',
    payload.emailBaru || '',
    payload.tglLahirBaru || '',
    payload.alamatBaru || '',
    payload.hobiBaru || '',
    payload.kontakDaruratBaru || '',
    payload.alasan || '',
    payload.status || 'Diajukan',
    payload.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    new Date()
  ]);
  return { success: true, id: id };
}

function approveProfileChangeRequest(payload) {
  const req = payload.approvedData || {};
  if (req.nik) {
    saveUserProfile({
      nik: req.nik,
      nama: req.namaBaru,
      noHp: req.noHpBaru,
      email: req.emailBaru,
      tglLahir: req.tglLahirBaru,
      alamat: req.alamatBaru,
      hobi: req.hobiBaru,
      kontakDarurat: req.kontakDaruratBaru
    });
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pengajuan Profil');
  if (sheet) {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(payload.id).trim()) {
        sheet.getRange(i + 1, 12).setValue('Disetujui');
        break;
      }
    }
  }
  return { success: true };
}

function rejectProfileChangeRequest(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pengajuan Profil');
  if (sheet) {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]).trim() === String(payload.id).trim()) {
        sheet.getRange(i + 1, 12).setValue('Ditolak');
        break;
      }
    }
  }
  return { success: true };
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

function updateAbsensi(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Absensi');
  if (!sheet) return false;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const rowId = String(values[i][0]).trim();
    const rowNik = String(values[i][1]).trim();
    const rowDate = formatCellVal(values[i][3]);
    if (rowId === String(payload.id).trim() || (rowNik === String(payload.nik).trim() && rowDate === String(payload.tanggal).trim())) {
      if (payload.tanggal !== undefined) sheet.getRange(i + 1, 4).setValue(payload.tanggal);
      if (payload.shift !== undefined) sheet.getRange(i + 1, 5).setValue(payload.shift);
      if (payload.jamMasuk !== undefined) sheet.getRange(i + 1, 6).setValue(payload.jamMasuk);
      if (payload.jamPulang !== undefined) sheet.getRange(i + 1, 7).setValue(payload.jamPulang);
      if (payload.status !== undefined) sheet.getRange(i + 1, 8).setValue(payload.status);
      if (payload.keterlambatanMenit !== undefined) sheet.getRange(i + 1, 9).setValue(Number(payload.keterlambatanMenit || 0));
      if (payload.catatan !== undefined) sheet.getRange(i + 1, 10).setValue(payload.catatan);
      return true;
    }
  }
  return false;
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
    // Periode: 26 bulan lalu s/d 25 bulan ini
    const [pYear, pMonth] = periode.split('-').map(Number);
    const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
    const prevYear = pMonth === 1 ? pYear - 1 : pYear;
    const startDate = `${prevYear}-${String(prevMonth).padStart(2,'0')}-26`;
    const endDate   = `${pYear}-${String(pMonth).padStart(2,'0')}-25`;

    const userLembur = lemburRows.filter(l => {
      if (String(l.nik).trim() !== String(user.nik).trim()) return false;
      const tgl = String(l.tanggal || '');
      return tgl >= startDate && tgl <= endDate;
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

// ================= SINKRONISASI & BACKUP DARI SUPABASE KE GOOGLE SHEET =================
const SUPABASE_CONFIG = {
  url: 'https://rmrbfecagwcojtoqeovk.supabase.co',
  anonKey: 'sb_publishable_zOn1y93MF0x3CIy8MJ7I8Q_fQMkJ8x9'
};

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 WMS Backup & Sync')
      .addItem('⚡ Backup Sekarang (Tarik Data dari Supabase)', 'backupAllDataFromSupabase')
      .addItem('⏰ Pasang Auto-Backup Berkala (Setiap Jam)', 'installAutoBackupTrigger')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen notice: ' + e.message);
  }
}

function installAutoBackupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'backupAllDataFromSupabase') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('backupAllDataFromSupabase')
    .timeBased()
    .everyHours(1)
    .create();

  try {
    SpreadsheetApp.getUi().alert('✅ Auto-Backup berhasil dipasang!\nGoogle Sheet akan menyalin data terbaru dari Supabase secara otomatis setiap 1 jam.');
  } catch(e) {}
}

function fetchSupabaseTable(endpoint) {
  const res = UrlFetchApp.fetch(SUPABASE_CONFIG.url + '/rest/v1/' + endpoint, {
    method: 'get',
    headers: {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey
    },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
    return JSON.parse(res.getContentText());
  }
  return [];
}

function backupAllDataFromSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheets();

  let log = [];

  // 1. BACKUP DATA KARYAWAN
  try {
    const users = fetchSupabaseTable('karyawan?order=nik.asc');
    if (users && users.length > 0) {
      const sh = ss.getSheetByName('Data Karyawan');
      const headers = ['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Email', 'NoHP', 'GajiPokok', 'Tunjangan', 'RateLembur', 'SaldoKasbon', 'Status', 'Alamat', 'TglLahir', 'TglBergabung', 'Hobi', 'KontakDarurat', 'Foto', 'UpdatedAt'];
      const rows = [headers];
      users.forEach(u => {
        rows.push([
          u.nik || '',
          u.nama || '',
          u.divisi || 'Warehouse',
          u.username || u.nik || '',
          u.password || '',
          u.role || 'user',
          u.email || '',
          u.no_hp || '',
          Number(u.gaji_pokok || 0),
          Number(u.tunjangan || 0),
          Number(u.rate_lembur || 25000),
          Number(u.saldo_kasbon || 0),
          u.status || 'Aktif',
          u.alamat || '',
          u.tgl_lahir || '',
          u.tgl_bergabung || '',
          u.hobi || '',
          u.kontak_darurat || '',
          u.foto || '',
          u.updated_at || new Date().toISOString()
        ]);
      });
      sh.clear();
      sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
      log.push(`✅ Data Karyawan: ${users.length} data`);
    }
  } catch(err) {
    log.push(`❌ Data Karyawan: ` + err.message);
  }

  // 2. BACKUP DATA ABSENSI
  try {
    const absensi = fetchSupabaseTable('presensi?order=tanggal.desc');
    if (absensi && absensi.length > 0) {
      const sh = ss.getSheetByName('Data Absensi');
      const headers = ['ID', 'NIK', 'Nama', 'Divisi', 'Tanggal', 'Shift', 'Jam Masuk', 'Jam Pulang', 'Status Kehadiran', 'Keterlambatan (Menit)', 'Latitude Masuk', 'Longitude Masuk', 'Foto Presensi Masuk', 'Latitude Pulang', 'Longitude Pulang', 'Foto Presensi Pulang', 'Catatan', 'Tanggal Input'];
      const rows = [headers];
      absensi.forEach(a => {
        rows.push([
          a.id || '',
          a.nik || '',
          a.nama || '',
          a.divisi || '',
          a.tanggal || '',
          a.shift || '',
          a.jam_masuk || '',
          a.jam_pulang || '',
          a.status || '',
          Number(a.keterlambatan_menit || 0),
          a.lat_masuk || '',
          a.long_masuk || '',
          a.foto_masuk || '',
          a.lat_pulang || '',
          a.long_pulang || '',
          a.foto_pulang || '',
          a.catatan || '',
          a.created_at || ''
        ]);
      });
      sh.clear();
      sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
      log.push(`✅ Data Absensi: ${absensi.length} data`);
    }
  } catch(err) {
    log.push(`❌ Data Absensi: ` + err.message);
  }

  // 3. BACKUP JADWAL ROSTER SHIFT
  try {
    const roster = fetchSupabaseTable('roster_shift?order=tanggal.desc');
    if (roster && roster.length > 0) {
      const sh = ss.getSheetByName('Jadwal Shift');
      const headers = ['ID', 'NIK', 'Tanggal', 'Shift', 'JamMasuk', 'JamPulang', 'Keterangan'];
      const rows = [headers];
      roster.forEach(r => {
        rows.push([
          r.id || `ROSTER-${r.nik}-${r.tanggal}`,
          r.nik || '',
          r.tanggal || '',
          r.shift || '',
          r.jam_masuk || '',
          r.jam_pulang || '',
          r.keterangan || ''
        ]);
      });
      sh.clear();
      sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
      log.push(`✅ Jadwal Shift: ${roster.length} data`);
    }
  } catch(err) {
    log.push(`❌ Jadwal Shift: ` + err.message);
  }

  // 4. BACKUP DATA LEMBUR
  try {
    const lembur = fetchSupabaseTable('lembur?order=tanggal.desc');
    if (lembur && lembur.length > 0) {
      const sh = ss.getSheetByName('Data Lembur');
      const headers = ['ID', 'NIK', 'Nama', 'Divisi', 'Tanggal', 'Deskripsi', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Catatan', 'Tanggal Input', 'Status', 'UpdatedBy'];
      const rows = [headers];
      lembur.forEach(l => {
        rows.push([
          l.id || '',
          l.nik || '',
          l.nama || '',
          l.divisi || '',
          l.tanggal || '',
          l.deskripsi || '',
          l.jam_mulai || '',
          l.jam_selesai || '',
          Number(l.total_jam || 0),
          l.catatan || '',
          l.created_at || '',
          l.status || 'Diajukan',
          l.approved_by || ''
        ]);
      });
      sh.clear();
      sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
      log.push(`✅ Data Lembur: ${lembur.length} data`);
    }
  } catch(err) {
    log.push(`❌ Data Lembur: ` + err.message);
  }

  // 5. BACKUP DATA PERIJINAN
  try {
    const cuti = fetchSupabaseTable('cuti?order=tanggal_mulai.desc');
    if (cuti && cuti.length > 0) {
      const sh = ss.getSheetByName('Data Perijinan');
      const headers = ['ID', 'NIK', 'Nama', 'Divisi', 'Jenis', 'Tanggal Mulai', 'Tanggal Selesai', 'Alasan', 'Tanggal Input', 'Status', 'UpdatedBy'];
      const rows = [headers];
      cuti.forEach(c => {
        rows.push([
          c.id || '',
          c.nik || '',
          c.nama || '',
          c.divisi || '',
          c.jenis || '',
          c.tanggal_mulai || '',
          c.tanggal_selesai || '',
          c.alasan || '',
          c.created_at || '',
          c.status || 'Diajukan',
          c.approved_by || ''
        ]);
      });
      sh.clear();
      sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
      log.push(`✅ Data Perijinan: ${cuti.length} data`);
    }
  } catch(err) {
    log.push(`❌ Data Perijinan: ` + err.message);
  }

  // 6. BACKUP DATA MASTER SHIFT
  try {
    const shifts = fetchSupabaseTable('master_shift?order=id.asc');
    if (shifts && shifts.length > 0) {
      const sh = ss.getSheetByName('Data Shift');
      const headers = ['ID', 'NamaShift', 'JamMasuk', 'JamPulang', 'ToleransiMenit', 'Status'];
      const rows = [headers];
      shifts.forEach(s => {
        rows.push([
          s.id || '',
          s.nama_shift || '',
          s.jam_masuk || '',
          s.jam_pulang || '',
          Number(s.toleransi_menit || 15),
          s.status || 'Aktif'
        ]);
      });
      sh.clear();
      sh.getRange(1, 1, rows.length, headers.length).setValues(rows);
      log.push(`✅ Master Shift: ${shifts.length} data`);
    }
  } catch(err) {
    log.push(`❌ Master Shift: ` + err.message);
  }

  const resultMsg = 'Sinkronisasi Backup Selesai:\n' + log.join('\n');
  Logger.log(resultMsg);
  try {
    SpreadsheetApp.getUi().alert(resultMsg);
  } catch(e) {}
  return { success: true, log: log };
}

