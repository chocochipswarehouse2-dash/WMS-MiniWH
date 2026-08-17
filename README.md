# WMS Mini - Sistem Pengajuan Lembur & Ijin/Cuti

Aplikasi web modern (*Single Page Application*) untuk manajemen pengajuan lembur, ijin, dan cuti karyawan berbasis Google Spreadsheet & Google Apps Script (GAS), siap di-publish langsung melalui GitHub Pages.

---

## 🚀 Fitur Utama

1. **Tampilan & Tema UI Modern (IDE Style)**:
   - Layout responsif dengan **Sidebar Navigation** yang dapat di-collapse (buka/tutup) dan fleksibel pada semua level zoom monitor / mobile.
   - Dual tema: **Dark Mode (IDE Graphite)** dan **Light Mode (Studio Light)** dengan transisi halus.
   - Tipografi modern menggunakan Google Font **Inter** (UI) dan **JetBrains Mono** (Data/Kode/NIK).

2. **Pengajuan Lembur (Overtime)**:
   - Form dinamis multi-baris (bisa input banyak lembur dalam 1 kali submit).
   - Auto-kalkulasi durasi jam lembur otomatis (termasuk penanganan shift malam / lintas hari).
   - Export Rekapitulasi ke **PDF** (khusus karyawan sendiri maupun rekap semua karyawan untuk admin).

3. **Pengajuan Ijin / Cuti & Notifikasi Realtime**:
   - Pilihan jenis ijin: *Cuti Tahunan*, *Sakit*, *Ijin Lainnya*.
   - **Notifikasi Email Otomatis**:
     - Email otomatis dikirim ke Admin saat ada karyawan mengajukan ijin/cuti baru.
     - Email otomatis dikirim ke Karyawan saat Admin menyetujui (*Approved*) atau menolak (*Rejected*) pengajuan.
   - **1-Click WhatsApp Direct Chat**:
     - Tombol `📲 WA` di tabel status untuk langsung berkirim pesan notifikasi via WhatsApp Web / WhatsApp App.

4. **Kelola User & Data Karyawan (Admin)**:
   - Tambah, edit, dan hapus data karyawan.
   - Kolom kontak lengkap: **NIK, Nama, Divisi, Username, Password, Email Aktif, No. HP / WhatsApp, dan Role**.
   - Password karyawan dapat dilihat dan diedit langsung melalui form setting user.

---

## 📁 Struktur File

- `index.html` : Struktur antarmuka web, sidebar navigasi, form dinamis, dan modal popup.
- `style.css` : Desain sistem tema IDE (Dark & Light), styling sidebar, tabel, badge, dan modal.
- `script.js` : Logika frontend, state management, integrasi API, kalkulasi jam, dan handler WA/PDF.
- `apps-script.js` : Backend Google Apps Script (database sheets, logic CRUD, dan notifikasi email via `MailApp`).
- `README.md` : Dokumentasi lengkap sistem.

---

## 🛠️ Panduan Setup & Deployment

### 1. Setup Google Spreadsheet & Apps Script
1. Buat **Google Spreadsheet** baru di Google Drive Anda.
2. Buka menu **Extensions** > **Apps Script**.
3. Hapus kode default, lalu salin seluruh isi file [`apps-script.js`](apps-script.js) ke dalam editor Apps Script.
4. Klik **Deploy** > **New deployment**.
5. Pilih type **Web App**:
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone`
6. Klik **Deploy**, beri izin otorisasi Google (*Authorize Access*).
7. Salin **Web App URL** yang didapat.

### 2. Hubungkan ke Frontend
1. Buka file [`script.js`](script.js).
2. Perbarui nilai `GOOGLE_SHEET_WEB_APP_URL` di baris pertama dengan URL deployment Apps Script Anda:
   ```javascript
   const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
   ```

### 3. Deploy ke GitHub Pages
Jalankan perintah berikut di terminal:
```bash
git add .
git commit -m "feat: perbarui layout sidebar, notifikasi email & wa, dan manajemen user"
git push origin main
```
Di repository GitHub: Buka **Settings** > **Pages** > pilih branch `main` dan folder `/(root)` > Save.

---

## 🔑 Akun Default Awal
* **Username / NIK**: `WH0001` atau `admin`
* **Password**: `12345`
* **Role**: `admin`
