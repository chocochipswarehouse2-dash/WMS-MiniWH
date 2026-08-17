# WMS Mini - Warehouse Operations, Attendance & Payroll System

Aplikasi web modern (*Single Page Application*) komprehensif untuk manajemen operasional, presensi, perijinan, dan penggajian karyawan **Warehouse**, terintegrasi langsung dengan Google Spreadsheet sebagai database melalui Google Apps Script (GAS) dan dideploy via GitHub Pages.

---

## 🚀 Modul & Fitur Utama

### 1. 🕒 Presensi & Manajemen Shift Warehouse
- **Live Digital Clock & Widget Presensi**: Tombol *Check-In* (Presensi Masuk) dan *Check-Out* (Presensi Pulang) langsung dari web.
- **Master Shift Kerja**: Pengaturan jam kerja (Shift Pagi, Shift Siang/Malam, Normal) dengan toleransi keterlambatan otomatis.
- **Pencatatan Kehadiran**: Rekap status kehadiran (*Hadir, Terlambat, Ijin, Sakit, Alpha*) beserta durasi keterlambatan per menit.
- **Input Manual Presensi**: Admin dapat menambahkan atau mengoreksi presensi harian karyawan.

### 2. 📝 Pengajuan Lembur & Ijin/Cuti
- **Multi-Baris Input Lembur**: Input banyak item lembur sekaligus dengan auto-kalkulasi durasi jam (termasuk shift malam / lintas hari).
- **Perijinan / Cuti**: Pilihan *Cuti Tahunan, Sakit, Ijin Lainnya*.
- **Notifikasi Realtime**:
  - **Email Otomatis (via `MailApp`)**: Admin menerima email rincian pengajuan; Karyawan menerima email status persetujuan (*Approved/Rejected*).
  - **1-Click WhatsApp Direct Link**: Tombol `📲 WA` di tabel status untuk berkirim pesan konfirmasi langsung via WhatsApp Web/App.

### 3. 💳 Manajemen Kasbon & Pinjaman Karyawan
- Pencatatan pinjaman/kasbon karyawan warehouse.
- Skema pemotongan cicilan otomatis per bulan dari gaji.
- Pelacakan sisa saldo kasbon aktif per karyawan.

### 4. 💰 Payroll Engine Bulanan & Rekap Finance
- **Kalkulasi Otomatis Gaji Bulanan**:
  $$\text{Gaji Bersih (Take Home Pay)} = (\text{Gaji Pokok} + \text{Tunjangan} + (\text{Jam Lembur} \times \text{Rate Lembur})) - (\text{Cicilan Kasbon} + \text{Potongan Absensi} + \text{Potongan Lain})$$
- **Dashboard Audit Admin**: Admin dapat mengaudit & mengedit angka koreksi sebelum diajukan ke Finance.
- **Rekapitulasi Finance**: Tombol *Approve* pengajuan gaji ke finance dan fitur *Download PDF Rekapitulasi Gaji Finance* (format landscape resmi).

### 5. 📄 Slip Gaji Karyawan (Digital & PDF Resmi)
- Karyawan dapat melihat riwayat slip gaji bulanan mereka di menu **"Slip Gaji Saya"**.
- Fitur **Download PDF Slip Gaji Resmi** dengan rincian pendapatan, potongan, total take home pay, dan kolom tanda tangan serah terima.

### 6. 👥 Master Data Karyawan & Gaji
- Manajemen NIK, Nama, Divisi Warehouse, Username, Password (dapat dilihat/diedit), Gaji Pokok, Tunjangan, Rate Lembur per Jam, Email, dan No. HP/WA.

### 7. 🎨 UI/UX IDE Style (Dark Graphite & Studio Light)
- Sidebar navigasi collapsible (dapat dibuka/tutup).
- Layout responsif yang proporsional pada semua level zoom monitor & mobile.
- Tipografi modern Google Font *Inter* dan *JetBrains Mono*.

---

## 📁 Struktur File

- `index.html` : Struktur antarmuka web, sidebar navigasi, form modul, dan modal popup.
- `style.css` : Desain sistem tema IDE (Dark & Light), styling widget presensi, slip gaji, dan tabel audit.
- `script.js` : Logika frontend, state management, live clock, kalkulasi payroll, dan PDF generator.
- `code.js` / `apps-script.js` : Backend Google Apps Script (database CRUD 7 sheets, notifikasi email, dan API logic).
- `.clasp.json` & `.claspignore` : Konfigurasi integrasi deployment otomatis Google Apps Script CLI.
- `README.md` : Dokumentasi lengkap sistem.

---

## 🛠️ Deployment & Integrasi Otomatis

Proyek ini telah terintegrasi penuh:
1. **Google Apps Script (GAS)**: Dideploy otomatis menggunakan `clasp` (`npx @google/clasp push` & `deploy`).
2. **GitHub Pages**: Dideploy otomatis melalui git push ke branch `main`.

---

## 🔑 Akun Login Awal
* **Username / NIK**: `WH0001` atau `admin`
* **Password**: `12345`
* **Role**: `admin`
