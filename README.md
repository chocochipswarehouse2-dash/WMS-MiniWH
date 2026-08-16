# Web App Pengajuan Lembur

Aplikasi sederhana untuk mengajukan lembur dan otomatis mengirim data ke spreadsheet Google.

## Fitur utama
- Input nama, divisi, tanggal, deskripsi pekerjaan, jam mulai dan selesai
- Hitung total jam lembur otomatis
- Kirim data ke Google Sheets melalui Apps Script
- Sudah ada field tambahan seperti NIK, atasan, status, dan catatan

## Struktur file
- `index.html` : halaman form
- `style.css` : layout dan styling
- `script.js` : logika form + kirim data ke Apps Script
- `apps-script.js` : kode Google Apps Script untuk menulis ke sheet

## Langkah setup
1. Buka Google Sheets baru.
2. Buat sheet dengan nama `Lembur`.
3. Buka Google Apps Script lalu paste kode dari `apps-script.js`.
4. Deploy sebagai Web App dengan akses `Anyone`.
5. Salin URL hasil deployment ke `script.js` di variabel `GOOGLE_SHEET_WEB_APP_URL`.
6. Buka `index.html` di browser.

## Field yang direkomendasikan
Field inti yang sudah ada:
- Nama
- Tanggal
- Deskripsi pekerjaan
- Jam mulai
- Jam selesai

Field tambahan yang sangat berguna:
- NIK / ID karyawan
- Divisi / unit
- Atasan / penanggung jawab
- Status persetujuan
- Catatan tambahan
- Total jam otomatis

## Catatan
Untuk penggunaan nyata, ganti nilai placeholder URL di `script.js` dengan URL Apps Script yang aktif.
