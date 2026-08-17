# Daftar Perbaikan WMS Mini

## Status: PENDING APPROVAL

---

## 1. Tabel Cuti — Pecah Kolom & Fix Data Tanggal
- [x] Split kolom **Karyawan** → **Nama Karyawan** + **ID (NIK)**
- [x] Split kolom **Tanggal** → **Tgl Mulai** + **Tgl Selesai**
- [x] Fix data tanggal yang tampil kosong (`- s/d -`) — field `tgl_mulai`/`tgl_selesai` sudah ada di Supabase, diperbaiki di `renderCutiTables()`

## 2. Total Jam Lembur Kosong
- [x] Kolom **Total Jam** menampilkan `-` karena field `durasi_jam` di Supabase nol
- [x] Hitung otomatis dari selisih `jam_mulai` – `jam_selesai` jika `durasi_jam` = 0

## 3. Table Layout Crash — Kolom "Hubungi" Kepotong
- [x] CSS fix: `table-layout: fixed`, `overflow: hidden`, `text-overflow: ellipsis` pada cell bermasalah
- [x] Kolom Hubungi diberi max-width yang proporsional

## 4. Sembunyikan Menu Inventory & Task/Performa untuk User
- [x] Inventory, Inbound, Outbound, Task & Performa — tampil hanya jika `role === 'admin'`
- [x] Logika ini ditambahkan di `startApp()` sebagai cikal bakal sistem role-based access

## 5. Sidebar — Fix Teks Terpotong
- [x] Sidebar diberi `min-width` yang cukup, teks menggunakan `white-space: normal` agar wrap rapi
- [x] Brand title "WAREHOUSE MANAGEMENT" responsive di sidebar yang collapsed

## 6. Template CSV Shift — Format Baru dengan Date Picker
**Format baru:**
```
Nama,NIK,Tgl_2026-08-01,Tgl_2026-08-02,...,Tgl_2026-08-31
Nur Halimah,WH0005,,,,
Sasi Novita,WH0002,,,,
```
- [x] Kolom = karyawan, baris = tanggal (atau sebaliknya, matrix per user)
- [x] Tambah **date range picker** (Dari - Sampai tanggal) sebelum download template
- [x] Jam sudah otomatis diisi dari master shift — user tinggal isi nama shift (Shift 1 / Shift 2 / Libur / dst)
- [x] Validasi nama shift saat import disesuaikan master shift yang ada

---

## Open Questions
> Untuk format tabel template CSV shift, kolom yang diinginkan:
> `Nama | ID | Tgl1 | Tgl2 | dst` — tiap cell diisi nama shift
> Konfirmasi: saat import, sistem cari jam masuk/pulang dari master shift berdasarkan nama shift yang diisi?

---

## Urutan Implementasi
1. Fix renderCutiTables (kolom + tanggal) 
2. Fix total jam lembur
3. Fix CSS table crash + sidebar
4. Sembunyikan menu inventory/task untuk user
5. Rombak CSV template shift (date picker + format baru)
