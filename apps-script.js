function doGet() {
  return ContentService.createTextOutput('Sistem Lembur & Cuti WMS Mini siap digunakan.');
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
    karyawanSheet.appendRow(['NIK', 'Nama', 'Divisi', 'Username', 'Password', 'Role', 'Email', 'NoHP', 'Status', 'CreatedAt']);
    karyawanSheet.appendRow(['WH0001', 'Admin WMS', 'Warehouse', 'admin', '12345', 'admin', '', '', 'Aktif', new Date().toISOString()]);
  } else {
    // Check if Email & NoHP columns exist, if not append headers
    const headers = karyawanSheet.getRange(1, 1, 1, Math.max(karyawanSheet.getLastColumn(), 1)).getValues()[0];
    const headerStr = headers.map(h => String(h).toLowerCase()).join(',');
    if (!headerStr.includes('email')) {
      karyawanSheet.getRange(1, headers.length + 1).setValue('Email');
    }
    if (!headerStr.includes('nohp') && !headerStr.includes('hp') && !headerStr.includes('telepon')) {
      karyawanSheet.getRange(1, karyawanSheet.getLastColumn() + 1).setValue('NoHP');
    }
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

    // Auto-normalize alias keys for User
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
    email: match.email || '', noHp: match.noHp || match.nohp || ''
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
      noHp: String(u.noHp || u.nohp || u.telepon || u.hp || '').trim()
    }));
}

function saveUser(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data Karyawan');
  const values = sheet.getDataRange().getValues();
  const targetNIK = String(payload.nik || '').trim();

  const emailVal = String(payload.email || '').trim();
  const noHpVal = String(payload.noHp || payload.nohp || '').trim();

  let existingRowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === targetNIK) {
      existingRowIndex = i + 1; // 1-indexed row number
      break;
    }
  }

  const rowData = [
    targetNIK, 
    payload.nama || '', 
    payload.divisi || '', 
    payload.username || '', 
    payload.password || '', 
    payload.role || 'user', 
    emailVal, 
    noHpVal, 
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
    email: emailVal,
    noHp: noHpVal
  };
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

// ------------- PERIJINAN (IJIN / CUTI) -------------
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

  // Notifikasi Email ke Admin saat ada pengajuan ijin/cuti baru
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
      
      // Notifikasi Email ke Karyawan jika status berubah
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

      // Notifikasi Email ke Karyawan terkait Approval/Reject
      notifyEmployeeLeaveStatus(id, newStatus, adminUsername);
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

    const subject = `[WMS Mini] Pengajuan Ijin / Cuti Baru: ${perijinanList[0].nama}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #d0d7de; border-radius: 10px; background-color: #ffffff; color: #1f2328;">
        <h3 style="color: #0969da; margin-top: 0; display: flex; align-items: center; gap: 8px;">⚡ Notifikasi Pengajuan Ijin / Cuti</h3>
        <p>Halo Admin,</p>
        <p>Terdapat pengajuan Ijin / Cuti baru yang memerlukan review & persetujuan:</p>
        <ul style="padding-left: 20px; background: #f6f8fa; padding: 16px 20px; border-radius: 8px; border: 1px solid #e1e4e8;">
          ${summaryList}
        </ul>
        <p style="margin-top: 20px;">Silakan login ke web <strong>WMS Mini</strong> untuk melakukan persetujuan (Approve / Reject).</p>
        <hr style="border: 0; border-top: 1px solid #d0d7de; margin: 20px 0;" />
        <small style="color: #6e7681;">Sistem Otomatis Notifikasi WMS Mini</small>
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

    const subject = `[WMS Mini] ${statusIcon} Status Ijin/Cuti Anda: ${newStatus}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #d0d7de; border-radius: 10px; background-color: #ffffff; color: #1f2328;">
        <h3 style="color: ${statusColor}; margin-top: 0;">${statusIcon} Pengajuan Ijin / Cuti ${newStatus}</h3>
        <p>Halo <strong>${employee.nama}</strong>,</p>
        <p>Pengajuan perijinan Anda dengan rincian berikut telah diperbarui statusnya:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f6f8fa; border-radius: 8px;">
          <tr><td style="padding: 8px 12px; font-weight: bold; width: 140px;">Jenis:</td><td style="padding: 8px 12px;">${item.jenis}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Periode:</td><td style="padding: 8px 12px;">${item.tanggalMulai} s/d ${item.tanggalSelesai}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Alasan:</td><td style="padding: 8px 12px;">${item.alasan || '-'}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Status:</td><td style="padding: 8px 12px; font-weight: bold; color: ${statusColor};">${newStatus}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold;">Diupdate Oleh:</td><td style="padding: 8px 12px;">${adminUsername || 'Admin'}</td></tr>
        </table>
        <p>Terima kasih telah menggunakan sistem WMS Mini.</p>
        <hr style="border: 0; border-top: 1px solid #d0d7de; margin: 20px 0;" />
        <small style="color: #6e7681;">Sistem Otomatis Notifikasi WMS Mini</small>
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