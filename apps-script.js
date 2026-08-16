function doPost(e) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName('Lembur');

    if (!sheet) {
      sheet = spreadsheet.insertSheet('Lembur');
      sheet.appendRow([
        'Nama',
        'NIK',
        'Divisi',
        'Tanggal',
        'Deskripsi Pekerjaan',
        'Jam Mulai',
        'Jam Selesai',
        'Total Jam',
        'Atasan',
        'Status',
        'Catatan',
        'Tanggal Input'
      ]);
    }

    let data = {};

    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        data = {};
      }
    }

    const row = [
      data.nama || '',
      data.nik || '',
      data.divisi || '',
      data.tanggal || '',
      data.deskripsi || '',
      data.jamMulai || '',
      data.jamSelesai || '',
      data.totalJam || '',
      data.atasan || '',
      data.status || 'Menunggu Persetujuan',
      data.catatan || '',
      new Date().toISOString()
    ];

    sheet.appendRow(row);

    return ContentService.createTextOutput('Data lembur berhasil ditambahkan ke spreadsheet.');
  } catch (error) {
    return ContentService.createTextOutput('Error: ' + error.message).setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet() {
  return ContentService.createTextOutput('Gunakan form web untuk mengirim data lembur.');
}
