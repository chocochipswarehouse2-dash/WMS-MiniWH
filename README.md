# Warehouse Management System (WMS)

Aplikasi web modern (*Single Page Application*) komprehensif untuk manajemen operasional, presensi, jadwal shift roster, perijinan, dan penggajian karyawan **Warehouse**, terintegrasi langsung dengan Google Spreadsheet sebagai database melalui Google Apps Script (GAS) dan dideploy via GitHub Pages.

---

## 🏛️ 3 Pilar Utama Warehouse Management

### 1. 👥 Management Karyawan & HR
- **Presensi & Dashboard Shift Karyawan**:
  - Live Digital Clock & widget presensi Masuk / Pulang.
  - Kartu Dashboard Shift Harian & Roster 7 Hari ke Depan (karyawan dapat langsung memantau jam kerjanya).
  - Ketentuan Shift Otomatis:
    - **Shift 1**: `08:00 - 17:00`
    - **Shift 2**: `09:00 - 18:00`
    - **Shift 3**: `12:00 - 21:00` (Khusus hari **Sabtu**: `11:00 - 20:00`)
    - **Hari Minggu**: `LIBUR`
- **Jadwal Roster Shift**:
  - Fitur **Download Template CSV Jadwal Shift**.
  - Fitur **Export CSV** dan **Import CSV** Jadwal Roster Karyawan.
- **Pengajuan Lembur (Privat)**:
  - Input banyak baris lembur sekaligus dengan auto-kalkulasi durasi jam.
  - Data lembur bersifat privat (hanya bisa dilihat oleh karyawan bersangkutan dan Admin).
  - Pembatasan akses: Hanya Admin yang memiliki akses edit/hapus lembur.
- **Info Ijin & Cuti (Transparan Seluruh Tim)**:
  - Transparansi status cuti/ijin seluruh staf warehouse agar mempermudah koordinasi shift & operasional.
  - Notifikasi otomatis via **Email Admin** dan **Direct WhatsApp Link**.
- **Slip Gaji & Payroll Bulanan**:
  - Kalkulasi otomatis take home pay, uang lembur, dan potongan kasbon.
  - Download PDF Slip Gaji Karyawan & Rekapitulasi Pembayaran Gaji Finance.
- **Kelola Data Karyawan**:
  - Master data gaji, rate lembur, password, kontak.
  - Fitur **Download Template CSV Karyawan**, **Export CSV**, dan **Import CSV**.

### 2. 📦 Management Inventory
- **Stok & Katalog Gudang**: Monitoring SKU barang, kategori, dan lokasi rak/bin.
- **Inbound & Staging**: Penerimaan barang masuk, pemeriksaan QC, dan put-away.
- **Outbound & Dispatch**: Pemrosesan pesanan keluar, verifikasi resi, dan serah terima kurir ekspedisi.

### 3. 📊 Task & Report Performa
- **Task Picking & Packing**: Antrian dan alokasi penugasan picking dan packing staf gudang.
- **KPI & Report Performa**: Analisis SLA packing, produktivitas harian tim, dan akurasi fulfillment.

---

## ⚡ Fitur UI/UX & Keamanan Sistem
- **Animasi Loading & Anti Double-Click**: Semua tombol submit form dilengkapi indikator spinner berputar, status teks dinamis (*"Memproses..."*), dan otomatis di-`disable` saat transaksi berlangsung untuk mencegah input data ganda.
- **Role Permission Enforcement**: User biasa (karyawan) tidak diberikan tombol edit/hapus liar pada data yang sudah disubmit; hanya Admin yang memiliki hak koreksi.
- **Tema IDE**: Mendukung Dark Graphite & Studio Light.
- **Sidebar Navigasi Responsive**: Collapsible sidebar dengan tampilan nyaman pada desktop, tablet, maupun mobile drawer.

---

## 📁 Struktur File Proyek

- `index.html` : Antarmuka web, sidebar 3 pilar, form, kalender roster, dan modal CSV.
- `style.css` : Desain sistem tema IDE, spinner animasi loading, dan roster card layout.
- `script.js` : Logika frontend, CSV parser & exporter, anti double-click loading, dan PDF generator.
- `code.js` / `apps-script.js` : Backend Google Apps Script (CRUD 8 sheets database, email notification, bulk import).
- `.clasp.json` & `.claspignore` : Konfigurasi integrasi deployment otomatis Google Apps Script CLI.
- `README.md` : Dokumentasi lengkap sistem.

---

## 🔑 Akun Login Default
* **Username / NIK**: `WH0001` atau `admin`
* **Password**: `12345`
* **Role**: `admin`
