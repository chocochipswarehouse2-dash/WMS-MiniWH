-- ==============================================================================
-- WAREHOUSE MANAGEMENT SYSTEM (WMS) - SUPABASE DATABASE SCHEMA
-- Compatible with PostgreSQL & Supabase API
-- ==============================================================================

-- 1. TABEL KARYAWAN & USER
CREATE TABLE IF NOT EXISTS karyawan (
    nik VARCHAR(50) PRIMARY KEY,
    nama VARCHAR(150) NOT NULL,
    divisi VARCHAR(100) NOT NULL DEFAULT 'Warehouse',
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'user', -- 'admin' atau 'user'
    gaji_pokok NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tunjangan NUMERIC(15, 2) NOT NULL DEFAULT 0,
    rate_lembur NUMERIC(15, 2) NOT NULL DEFAULT 0,
    saldo_kasbon NUMERIC(15, 2) NOT NULL DEFAULT 0,
    email VARCHAR(150),
    no_hp VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL MASTER SHIFT
CREATE TABLE IF NOT EXISTS master_shift (
    id SERIAL PRIMARY KEY,
    nama_shift VARCHAR(50) NOT NULL UNIQUE,
    jam_masuk TIME NOT NULL,
    jam_pulang TIME NOT NULL,
    toleransi INTEGER NOT NULL DEFAULT 15,
    status VARCHAR(30) NOT NULL DEFAULT 'Aktif',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL ROSTER SHIFT HARIAN
CREATE TABLE IF NOT EXISTS roster_shift (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(50) REFERENCES karyawan(nik) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    shift VARCHAR(50) NOT NULL,
    jam_masuk VARCHAR(10),
    jam_pulang VARCHAR(10),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nik, tanggal)
);

-- 4. TABEL PRESENSI & ABSENSI HARIAN
CREATE TABLE IF NOT EXISTS presensi (
    id SERIAL PRIMARY KEY,
    nik VARCHAR(50) REFERENCES karyawan(nik) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    shift VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Hadir', -- 'Hadir', 'Terlambat', 'Ijin', 'Sakit', 'Alpha'
    jam_masuk TIME,
    jam_pulang TIME,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nik, tanggal)
);

-- 5. TABEL PENGAJUAN LEMBUR
CREATE TABLE IF NOT EXISTS lembur (
    id VARCHAR(50) PRIMARY KEY,
    nik VARCHAR(50) REFERENCES karyawan(nik) ON DELETE CASCADE,
    nama VARCHAR(150) NOT NULL,
    divisi VARCHAR(100),
    tanggal DATE NOT NULL,
    deskripsi TEXT NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    durasi_jam NUMERIC(6, 2) NOT NULL DEFAULT 0,
    rate_lembur NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_lembur NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Diajukan', -- 'Diajukan', 'Disetujui', 'Ditolak'
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL PERIJINAN & CUTI
CREATE TABLE IF NOT EXISTS perijinan_cuti (
    id VARCHAR(50) PRIMARY KEY,
    nik VARCHAR(50) REFERENCES karyawan(nik) ON DELETE CASCADE,
    nama VARCHAR(150) NOT NULL,
    divisi VARCHAR(100),
    jenis VARCHAR(50) NOT NULL DEFAULT 'Cuti Tahunan', -- 'Cuti Tahunan', 'Sakit', 'Ijin'
    tgl_mulai DATE NOT NULL,
    tgl_selesai DATE NOT NULL,
    jumlah_hari INTEGER NOT NULL DEFAULT 1,
    alasan TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Diajukan', -- 'Diajukan', 'Disetujui', 'Ditolak'
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL KASBON KARYAWAN
CREATE TABLE IF NOT EXISTS kasbon (
    id VARCHAR(50) PRIMARY KEY,
    nik VARCHAR(50) REFERENCES karyawan(nik) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    jumlah NUMERIC(15, 2) NOT NULL DEFAULT 0,
    cicilan NUMERIC(15, 2) NOT NULL DEFAULT 0,
    sisa_saldo NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Aktif', -- 'Aktif', 'Lunas', 'Dibatalkan'
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL PAYROLL BULANAN
CREATE TABLE IF NOT EXISTS payroll (
    id VARCHAR(50) PRIMARY KEY, -- e.g. PAY-2026-08-WH0001
    periode VARCHAR(20) NOT NULL, -- e.g. 2026-08
    nik VARCHAR(50) REFERENCES karyawan(nik) ON DELETE CASCADE,
    nama VARCHAR(150) NOT NULL,
    divisi VARCHAR(100),
    gaji_pokok NUMERIC(15, 2) NOT NULL DEFAULT 0,
    tunjangan NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total_jam_lembur NUMERIC(6, 2) NOT NULL DEFAULT 0,
    rate_lembur NUMERIC(15, 2) NOT NULL DEFAULT 0,
    uang_lembur NUMERIC(15, 2) NOT NULL DEFAULT 0,
    potongan_kasbon NUMERIC(15, 2) NOT NULL DEFAULT 0,
    potongan_absensi NUMERIC(15, 2) NOT NULL DEFAULT 0,
    potongan_lain NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gaji_bersih NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft', -- 'Draft', 'Disetujui Finance', 'Dibayarkan'
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(periode, nik)
);

-- 9. TABEL INVENTORY (KATALOG STOK & BIN LOCATION)
CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    barcode VARCHAR(100),
    nama_barang VARCHAR(255) NOT NULL,
    kategori VARCHAR(100) DEFAULT 'General',
    unit VARCHAR(30) DEFAULT 'Pcs',
    lokasi_rak VARCHAR(100) DEFAULT 'A-01-01',
    qty_stok INTEGER NOT NULL DEFAULT 0,
    min_stok INTEGER NOT NULL DEFAULT 5,
    max_stok INTEGER NOT NULL DEFAULT 1000,
    status VARCHAR(30) NOT NULL DEFAULT 'Aktif',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL INBOUND & RECEIVING
CREATE TABLE IF NOT EXISTS inbound_orders (
    id VARCHAR(50) PRIMARY KEY,
    no_po VARCHAR(100) NOT NULL,
    supplier VARCHAR(150) NOT NULL,
    tanggal DATE NOT NULL,
    total_item INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Staging', -- 'Staging', 'QC Passed', 'Put-away Done'
    catatan TEXT,
    created_by VARCHAR(50) REFERENCES karyawan(nik),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL OUTBOUND & DISPATCH
CREATE TABLE IF NOT EXISTS outbound_orders (
    id VARCHAR(50) PRIMARY KEY,
    no_do VARCHAR(100) NOT NULL,
    customer VARCHAR(150) NOT NULL,
    ekspedisi VARCHAR(100),
    no_resi VARCHAR(100),
    tanggal DATE NOT NULL,
    total_item INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Packed', 'Dispatched'
    catatan TEXT,
    created_by VARCHAR(50) REFERENCES karyawan(nik),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABEL WAREHOUSE TASKS (PICKING & PACKING)
CREATE TABLE IF NOT EXISTS warehouse_tasks (
    id VARCHAR(50) PRIMARY KEY,
    task_type VARCHAR(50) NOT NULL, -- 'Picking', 'Packing', 'Stock Opname'
    ref_no VARCHAR(100),
    assigned_to_nik VARCHAR(50) REFERENCES karyawan(nik),
    priority VARCHAR(30) DEFAULT 'Normal', -- 'Low', 'Normal', 'Urgent'
    status VARCHAR(30) DEFAULT 'Assigned', -- 'Assigned', 'In Progress', 'Completed'
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- DEFAULT DATA SEEDING (DATA AWAL)
-- ==============================================================================

-- Seed Admin & Demo Karyawan
INSERT INTO karyawan (nik, nama, divisi, username, password, role, gaji_pokok, tunjangan, rate_lembur, saldo_kasbon, email, no_hp)
VALUES 
    ('WH0001', 'Administrator Warehouse', 'Management', 'admin', 'admin123', 'admin', 5000000, 1000000, 30000, 0, 'admin@warehouse.com', '081234567890'),
    ('WH0002', 'Budi Santoso', 'Staging & Inbound', 'budi', 'user123', 'user', 4500000, 500000, 25000, 0, 'budi@warehouse.com', '081234567891'),
    ('WH0003', 'Siti Rahma', 'Picking & Packing', 'siti', 'user123', 'user', 4500000, 500000, 25000, 0, 'siti@warehouse.com', '081234567892')
ON CONFLICT (nik) DO NOTHING;

-- Seed Master Shift
INSERT INTO master_shift (nama_shift, jam_masuk, jam_pulang, toleransi, status)
VALUES 
    ('Shift 1', '08:00:00', '17:00:00', 15, 'Aktif'),
    ('Shift 2', '09:00:00', '18:00:00', 15, 'Aktif'),
    ('Shift 3', '12:00:00', '21:00:00', 15, 'Aktif')
ON CONFLICT (nama_shift) DO NOTHING;

-- 13. TABEL INVENTORY STOCK MATRIX (FISIK VS DEALPOS)
CREATE TABLE IF NOT EXISTS inv_stock (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    nama_produk VARCHAR(255) NOT NULL,
    size VARCHAR(50),
    kategori VARCHAR(100) DEFAULT 'General',
    lokasi_rak VARCHAR(100) NOT NULL,
    area VARCHAR(50) NOT NULL, -- 'Gudang Utama', 'Barang Live', 'Sample Studio', 'Permak / Cuci', 'Barang Cacat', 'WH', 'QC', 'GA'
    kategori_area VARCHAR(50) NOT NULL, -- 'ONLINE', 'PERBAIKAN', 'OFFLINE'
    qty_fisik INTEGER NOT NULL DEFAULT 0,
    qty_dealpos INTEGER NOT NULL DEFAULT 0,
    selisih INTEGER GENERATED ALWAYS AS (qty_fisik - qty_dealpos) STORED,
    keterangan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sku, lokasi_rak, area)
);

CREATE INDEX IF NOT EXISTS idx_inv_stock_sku ON inv_stock(sku);
CREATE INDEX IF NOT EXISTS idx_inv_stock_area ON inv_stock(area);
CREATE INDEX IF NOT EXISTS idx_inv_stock_kategori_area ON inv_stock(kategori_area);

-- 14. TABEL PEMINJAMAN SEMENTARA (SPS)
CREATE TABLE IF NOT EXISTS inv_peminjaman (
    id VARCHAR(50) PRIMARY KEY,
    no_sps VARCHAR(100) NOT NULL UNIQUE,
    peminjam VARCHAR(150) NOT NULL,
    divisi VARCHAR(100) NOT NULL,
    keperluan TEXT NOT NULL,
    tanggal_pinjam DATE NOT NULL,
    tanggal_kembali DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Dipinjam', -- 'Dipinjam', 'Dikembalikan', 'Terlambat', 'Dibatalkan'
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { sku, namaProduk, size, qty, catatan }
    total_qty INTEGER NOT NULL DEFAULT 1,
    catatan TEXT,
    approved_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABEL MONITORING & PERMINTAAN REFILL
CREATE TABLE IF NOT EXISTS inv_refill (
    id VARCHAR(50) PRIMARY KEY,
    no_refill VARCHAR(100) NOT NULL UNIQUE,
    sku VARCHAR(100) NOT NULL,
    nama_produk VARCHAR(255) NOT NULL,
    size VARCHAR(50),
    dari_lokasi VARCHAR(100) NOT NULL,
    ke_lokasi VARCHAR(100) NOT NULL,
    channel VARCHAR(100) NOT NULL DEFAULT 'Gudang Utama', -- 'MAP', 'Live', 'Studio', 'Shopee', 'TikTok'
    qty_diminta INTEGER NOT NULL DEFAULT 1,
    qty_dialokasi INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Dialokasi', 'Selesai', 'Dibatalkan'
    pemohon VARCHAR(150),
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. TABEL LOG MUTASI & PERGERAKAN PRODUK
CREATE TABLE IF NOT EXISTS inv_log_mutasi (
    id SERIAL PRIMARY KEY,
    tanggal TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sku VARCHAR(100) NOT NULL,
    nama_produk VARCHAR(255),
    size VARCHAR(50),
    lokasi_rak VARCHAR(100),
    area VARCHAR(50),
    type VARCHAR(30) NOT NULL, -- 'IN', 'OUT', 'SO', 'ADJ_IN', 'ADJ_OUT'
    qty INTEGER NOT NULL DEFAULT 1,
    invoice VARCHAR(100),
    operator VARCHAR(100),
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable read & write for anon key (Frontend API)
-- ==============================================================================
ALTER TABLE karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE roster_shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE lembur ENABLE ROW LEVEL SECURITY;
ALTER TABLE perijinan_cuti ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasbon ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_peminjaman ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_refill ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv_log_mutasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all access on karyawan" ON karyawan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on master_shift" ON master_shift FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on roster_shift" ON roster_shift FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on presensi" ON presensi FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on lembur" ON lembur FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on perijinan_cuti" ON perijinan_cuti FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on kasbon" ON kasbon FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on payroll" ON payroll FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on inventory_items" ON inventory_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on inbound_orders" ON inbound_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on outbound_orders" ON outbound_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on warehouse_tasks" ON warehouse_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on inv_stock" ON inv_stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on inv_peminjaman" ON inv_peminjaman FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on inv_refill" ON inv_refill FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on inv_log_mutasi" ON inv_log_mutasi FOR ALL USING (true) WITH CHECK (true);

