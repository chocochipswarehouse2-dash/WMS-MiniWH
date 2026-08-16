function doGet() {
  return ContentService.createTextOutput('Sistem lembur siap digunakan.');
}

function doPost(e) {
  try {
    ensureSheets();

    let payload = {};
    const contents = e && e.postData && e.postData.contents ? e.postData.contents : '';

    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      payload = e.parameter;
    } else if (contents) {
      try {
        payload = JSON.parse(contents);
      } catch (err) {
        payload = parseQueryString(contents);
      }
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
      case 'getLembur':
        return jsonResponse({ success: true, data: getLembur(payload.nik || '', payload.role || '') });
      case 'saveLembur':
        return jsonResponse({ success: true, row: saveLembur(payload) });
      case 'deleteLembur':
        return jsonResponse({ success: true, ok: deleteLembur(payload.id) });
      default:
        return jsonResponse({ success: false, message: 'Action tidak valid.' });
    }
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || 'Terjadi error.' });
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
    lemburSheet.appendRow(['ID', 'NIK', 'Nama', 'Divisi', 'Tanggal', 'Deskripsi', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Tanggal Input', 'Status', 'EditedFlag', 'UpdatedAt', 'UpdatedBy', 'Catatan']);
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function parseQueryString(raw) {
  const result = {};
  const pairs = raw.split('&');
  pairs.forEach(function (pair) {
    if (!pair) return;
    const [key, value] = pair.split('=');
    result[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return result;
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
    headers.forEach(function (header, index) {
      obj[String(header).trim()] = row[index] || '';
    });
    rows.push(obj);
  }

  return rows;
}

function loginUser(username, password) {
  const users = getSheetRows('Data Karyawan');
  const match = users.find(function (user) {
    return (String(user.Username || '').trim() === String(username || '').trim() || String(user.NIK || '').trim() === String(username || '').trim())
      && String(user.Password || '').trim() === String(password || '').trim();
  });

  if (!match) return null;

  return {
    nik: String(match.NIK || '').trim(),
    nama: String(match.Nama || '').trim(),
    divisi: String(match.Divisi || '').trim(),
    username: String(match.Username || '').trim(),
    role: String(match.Role || 'user').trim(),
  };
}

function getUsers() {
  const users = getSheetRows('Data Karyawan');
  return users
    .filter(function (user) {
      return String(user.NIK || '').trim() !== '';
    })
    .map(function (user) {
      return {
        nik: String(user.NIK || '').trim(),
        nama: String(user.Nama || '').trim(),
        divisi: String(user.Divisi || '').trim(),
        username: String(user.Username || '').trim(),
        password: String(user.Password || '').trim(),
        role: String(user.Role || 'user').trim(),
      };
    });
}

function saveUser(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Data Karyawan');
  const users = getUsers();
  const targetNIK = String(payload.nik || '').trim();

  if (!targetNIK) {
    throw new Error('NIK wajib diisi.');
  }

  const existingIndex = users.findIndex(function (user) {
    return user.nik === targetNIK;
  });

  const row = [
    targetNIK,
    String(payload.nama || '').trim(),
    String(payload.divisi || '').trim(),
    String(payload.username || '').trim(),
    String(payload.password || '').trim(),
    String(payload.role || 'user').trim(),
    'Aktif',
    new Date().toISOString()
  ];

  if (existingIndex >= 0) {
    const rowIndex = existingIndex + 2;
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return {
    nik: targetNIK,
    nama: String(payload.nama || '').trim(),
    divisi: String(payload.divisi || '').trim(),
    username: String(payload.username || '').trim(),
    password: String(payload.password || '').trim(),
    role: String(payload.role || 'user').trim(),
  };
}

function deleteUser(nik) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Data Karyawan');
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(nik || '').trim()) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  return false;
}

function getLembur(nik, role) {
  const rows = getSheetRows('Data Lembur');

  if (role === 'admin') {
    return rows.filter(function (row) {
      return String(row.ID || '').trim() !== '';
    });
  }

  return rows.filter(function (row) {
    return String(row.NIK || '').trim() === String(nik || '').trim();
  });
}

function saveLembur(payload) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Data Lembur');
  const rows = getSheetRows('Data Lembur');

  const id = String(payload.id || '').trim() || String(Date.now());
  const row = [
    id,
    String(payload.nik || '').trim(),
    String(payload.nama || '').trim(),
    String(payload.divisi || '').trim(),
    String(payload.tanggal || '').trim(),
    String(payload.deskripsi || '').trim(),
    String(payload.jamMulai || '').trim(),
    String(payload.jamSelesai || '').trim(),
    String(payload.totalJam || '').trim(),
    new Date().toISOString(),
    String(payload.status || 'Diajukan').trim(),
    String(payload.editedFlag || 'Tidak').trim(),
    String(payload.updatedAt || new Date().toISOString()).trim(),
    String(payload.updatedBy || '').trim(),
    String(payload.catatan || '').trim()
  ];

  const matchIndex = rows.findIndex(function (item) {
    return String(item.ID || '').trim() === id;
  });

  if (matchIndex >= 0) {
    const targetRow = matchIndex + 2;
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return row;
}

function deleteLembur(id) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName('Data Lembur');
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === String(id || '').trim()) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  return false;
}
