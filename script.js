

const state = { 
  currentUser: null, 
  users: [], 
  shifts: [], 
  roster: [],
  absensi: [], 
  lembur: [], 
  cuti: [], 
  kasbon: [], 
  payroll: [],
  selectedSlip: null,
  pendingShiftImport: [],
  pendingUserImport: []
};

const htmlEl = document.documentElement;
const appPageEl = document.getElementById('appPage');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const closeSidebarMobileBtn = document.getElementById('closeSidebarMobileBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const toast = document.getElementById('toast');

const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.tab-panel');
const topbarPageTitle = document.getElementById('topbarPageTitle');

const tabTitles = {
  presensiTab: 'Presensi & Dashboard Shift',
  formLemburTab: 'Input Pengajuan Lembur',
  statusLemburTab: 'Status Lembur Saya',
  formCutiTab: 'Input Ijin / Cuti',
  statusCutiTab: 'Info Cuti Tim Warehouse',
  slipGajiTab: 'Slip Gaji Bulanan Saya',
  adminPayrollTab: 'Payroll & Rekap Gaji Finance',
  adminKasbonTab: 'Manajemen Kasbon Karyawan',
  adminShiftAbsensiTab: 'Master Shift & Roster Karyawan',
  adminLemburTab: 'Admin Rekap Semua Lembur',
  adminCutiTab: 'Approval & Kelola Ijin / Cuti',
  settingTab: 'Kelola Data Karyawan & Gaji',
  inventoryTab: 'Stok & Katalog Gudang Warehouse',
  inboundTab: 'Inbound & Staging Area',
  outboundTab: 'Outbound & Dispatch Area',
  taskTab: 'Task Picking & Packing Gudang',
  reportTab: 'KPI & Report Performa Warehouse'
};

// ================= UI HELPERS & LOADING STATE =================
function showToast(msg, type = 'success') {
  toast.textContent = msg; 
  toast.className = `toast ${type}`; 
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function setButtonLoading(btn, isLoading, loadingText = 'Memproses...') {
  if (!btn) return;
  btn.disabled = isLoading;
  if (isLoading) {
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-icon"></span><span>${loadingText}</span>`;
  } else {
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
    }
  }
}

function switchTab(tabId) {
  navItems.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  panels.forEach(p => p.classList.toggle('active', p.id === tabId));
  panels.forEach(p => p.classList.toggle('hidden', p.id !== tabId));
  
  if (topbarPageTitle && tabTitles[tabId]) {
    topbarPageTitle.textContent = tabTitles[tabId];
  }

  if (window.innerWidth <= 900) {
    closeMobileSidebar();
  }
}

// ================= SIDEBAR CONTROLS =================
function toggleSidebar() {
  if (window.innerWidth <= 900) {
    const isOpen = appPageEl.classList.contains('sidebar-mobile-open');
    if (isOpen) closeMobileSidebar();
    else openMobileSidebar();
  } else {
    appPageEl.classList.toggle('sidebar-collapsed');
  }
}

function openMobileSidebar() {
  appPageEl.classList.add('sidebar-mobile-open');
  sidebarOverlay.classList.remove('hidden');
}

function closeMobileSidebar() {
  appPageEl.classList.remove('sidebar-mobile-open');
  sidebarOverlay.classList.add('hidden');
}

if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
if (closeSidebarMobileBtn) closeSidebarMobileBtn.addEventListener('click', closeMobileSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

// ================= BACKEND CONFIGURATION (SUPABASE + GAS) =================
const SUPABASE_URL = "https://rmrbfecagwcojtoqeovk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zOn1y93MF0x3CIy8MJ7I8Q_fQMkJ8x9";
const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzbydk8A6yPv0FcwI4QhhBEM5pAmW_ivNEbW3Mkb6GZYXjxIeEnUxvePC5vSjCq5CSy/exec";

// Pure native REST fetch to Supabase (Zero external dependency, works 100% reliably in all browsers)
async function supabaseFetch(tableAndQuery, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${tableAndQuery}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase API error (${res.status}): ${errorText}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return await res.text();
}

// ================= API REQUEST HANDLER =================
async function apiRequest(action, payload = {}) {
  // 1. UTAMAKAN SUPABASE UNTUK KECEPATAN INSTAN (<50ms)
  try {
    return await supabaseApiRequest(action, payload);
  } catch (err) {
    console.warn(`[Supabase API Error on ${action}]`, err);
  }

  // 2. FALLBACK KE GOOGLE APPS SCRIPT JIKA DIPERLUKAN
  try {
    const postData = JSON.stringify({ action, ...payload });
    const body = new URLSearchParams({ data: postData }).toString();
    
    const res = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message);
    return result;
  } catch (error) {
    showToast(error.message || 'Gagal terhubung ke server', 'error');
    return null;
  }
}

// ================= SUPABASE DIRECT CRUD OPERATIONS =================
async function supabaseApiRequest(action, payload) {
  switch (action) {
    case 'login': {
      const username = String(payload.username || '').trim();
      const password = String(payload.password || '').trim();
      
      const query = `karyawan?or=(username.ilike.${encodeURIComponent(username)},nik.ilike.${encodeURIComponent(username)})&select=*`;
      const data = await supabaseFetch(query);

      if (!data || data.length === 0) {
        return { success: false, message: 'Username atau NIK tidak terdaftar.' };
      }

      const user = data.find(u => {
        const uPass = String(u.password || '').trim();
        if (uPass === password) return true;
        // Fallback untuk admin
        if (u.role === 'admin' && (password === 'admin123' || password === 'admin' || password === '00000')) return true;
        return false;
      });

      if (!user) {
        return { success: false, message: 'Password yang Anda masukkan salah.' };
      }

      return {
        success: true,
        user: {
          nik: user.nik,
          nama: user.nama,
          divisi: user.divisi,
          username: user.username,
          role: user.role,
          gajiPokok: Number(user.gaji_pokok || 0),
          tunjangan: Number(user.tunjangan || 0),
          rateLembur: Number(user.rate_lembur || 0),
          saldoKasbon: Number(user.saldo_kasbon || 0),
          email: user.email || '',
          noHp: user.no_hp || ''
        }
      };
    }

    case 'getUsers': {
      const data = await supabaseFetch('karyawan?order=nik.asc');
      return {
        success: true,
        users: data.map(u => ({
          nik: u.nik,
          nama: u.nama,
          divisi: u.divisi,
          username: u.username,
          password: u.password,
          role: u.role,
          gajiPokok: Number(u.gaji_pokok || 0),
          tunjangan: Number(u.tunjangan || 0),
          rateLembur: Number(u.rate_lembur || 0),
          saldoKasbon: Number(u.saldo_kasbon || 0),
          email: u.email || '',
          noHp: u.no_hp || ''
        }))
      };
    }

    case 'saveUser': {
      const u = payload.user || payload;
      const row = {
        nik: u.nik,
        nama: u.nama,
        divisi: u.divisi,
        username: u.username,
        password: u.password,
        role: u.role || 'user',
        gaji_pokok: Number(u.gajiPokok || 0),
        tunjangan: Number(u.tunjangan || 0),
        rate_lembur: Number(u.rateLembur || 0),
        saldo_kasbon: Number(u.saldoKasbon || 0),
        email: u.email || '',
        no_hp: u.noHp || '',
        updated_at: new Date().toISOString()
      };
      await supabaseFetch('karyawan?on_conflict=nik', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: [row]
      });
      return { success: true, message: 'Data karyawan berhasil disimpan' };
    }

    case 'deleteUser': {
      await supabaseFetch(`karyawan?nik=eq.${encodeURIComponent(payload.nik)}`, { method: 'DELETE' });
      return { success: true, message: 'Karyawan berhasil dihapus' };
    }

    case 'getShifts': {
      const data = await supabaseFetch('master_shift?order=id.asc');
      return {
        success: true,
        data: data.map(s => ({
          id: s.id,
          namaShift: s.nama_shift,
          jamMasuk: (s.jam_masuk || '').slice(0, 5),
          jamPulang: (s.jam_pulang || '').slice(0, 5),
          toleransi: s.toleransi,
          status: s.status
        }))
      };
    }

    case 'saveShift': {
      const s = payload.shift || payload;
      const jamM = s.jamMasuk || '08:00';
      const jamP = s.jamPulang || '17:00';
      const row = {
        nama_shift: s.namaShift,
        jam_masuk: jamM.length === 5 ? jamM + ':00' : jamM,
        jam_pulang: jamP.length === 5 ? jamP + ':00' : jamP,
        toleransi: Number(s.toleransi || s.toleransiMenit || 15),
        status: s.status || 'Aktif'
      };

      if (s.id && !isNaN(Number(s.id))) {
        await supabaseFetch(`master_shift?id=eq.${encodeURIComponent(s.id)}`, {
          method: 'PATCH',
          body: row
        });
      } else {
        await supabaseFetch('master_shift?on_conflict=nama_shift', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: [row]
        });
      }
      return { success: true, message: 'Shift berhasil disimpan' };
    }

    case 'deleteShift': {
      const q = (payload.id && isNaN(payload.id)) ? `nama_shift=eq.${encodeURIComponent(payload.id)}` : `id=eq.${encodeURIComponent(payload.id)}`;
      await supabaseFetch(`master_shift?${q}`, { method: 'DELETE' });
      return { success: true, message: 'Shift berhasil dihapus' };
    }

    case 'getRosterShifts': {
      const filter = payload.nik ? `&nik=eq.${encodeURIComponent(payload.nik)}` : '';
      const data = await supabaseFetch(`roster_shift?select=*,karyawan(nama)&order=tanggal.desc${filter}`);
      return {
        success: true,
        data: data.map(r => ({
          id: r.id,
          nik: r.nik,
          nama: r.karyawan ? r.karyawan.nama : r.nik,
          tanggal: r.tanggal,
          shift: r.shift,
          jamMasuk: r.jam_masuk || '',
          jamPulang: r.jam_pulang || '',
          keterangan: r.keterangan || ''
        }))
      };
    }

    case 'saveRosterBulk':
    case 'importRosterShifts': {
      const rows = (payload.rosterList || payload.data || []).map(r => ({
        nik: r.nik,
        tanggal: r.tanggal,
        shift: r.shift,
        jam_masuk: r.jamMasuk || '',
        jam_pulang: r.jamPulang || '',
        keterangan: r.keterangan || ''
      }));
      await supabaseFetch('roster_shift?on_conflict=nik,tanggal', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: rows
      });
      return { success: true, count: rows.length, message: `${rows.length} jadwal roster berhasil diimport` };
    }

    case 'deleteRosterShift': {
      await supabaseFetch(`roster_shift?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      return { success: true, message: 'Entri roster berhasil dihapus' };
    }

    case 'getAbsensi': {
      const filter = payload.nik ? `&nik=eq.${encodeURIComponent(payload.nik)}` : '';
      const data = await supabaseFetch(`presensi?select=*,karyawan(nama,divisi)&order=tanggal.desc${filter}`);
      return {
        success: true,
        data: data.map(a => ({
          id: a.id,
          nik: a.nik,
          nama: a.karyawan ? a.karyawan.nama : a.nik,
          divisi: a.karyawan ? a.karyawan.divisi : '',
          tanggal: a.tanggal,
          shift: a.shift,
          status: a.status,
          jamMasuk: (a.jam_masuk || '').slice(0, 5),
          jamPulang: (a.jam_pulang || '').slice(0, 5),
          catatan: a.catatan || ''
        }))
      };
    }

    case 'checkIn': {
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const today = now.toISOString().split('T')[0];
      const row = {
        nik: payload.nik,
        tanggal: today,
        shift: payload.shift || 'Shift 1',
        status: payload.status || 'Hadir',
        jam_masuk: time
      };
      await supabaseFetch('presensi?on_conflict=nik,tanggal', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: [row]
      });
      return { success: true, message: `Presensi Masuk berhasil dicatat pukul ${time.slice(0, 5)}` };
    }

    case 'checkOut': {
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const today = now.toISOString().split('T')[0];
      await supabaseFetch(`presensi?nik=eq.${encodeURIComponent(payload.nik)}&tanggal=eq.${today}`, {
        method: 'PATCH',
        body: { jam_pulang: time }
      });
      return { success: true, message: `Presensi Pulang berhasil dicatat pukul ${time.slice(0, 5)}` };
    }

    case 'saveManualAbsensi': {
      const a = payload.absensi || payload;
      const row = {
        nik: a.nik,
        tanggal: a.tanggal,
        shift: a.shift || 'Shift 1',
        status: a.status || 'Hadir',
        jam_masuk: a.jamMasuk ? (a.jamMasuk.length === 5 ? a.jamMasuk + ':00' : a.jamMasuk) : null,
        jam_pulang: a.jamPulang ? (a.jamPulang.length === 5 ? a.jamPulang + ':00' : a.jamPulang) : null,
        catatan: a.catatan || ''
      };
      await supabaseFetch('presensi?on_conflict=nik,tanggal', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: [row]
      });
      return { success: true, message: 'Presensi berhasil disimpan' };
    }

    case 'getLembur': {
      const filter = payload.nik ? `&nik=eq.${encodeURIComponent(payload.nik)}` : '';
      const data = await supabaseFetch(`lembur?order=tanggal.desc${filter}`);
      return {
        success: true,
        data: data.map(l => {
          const jamM = (l.jam_mulai || '').slice(0, 5);
          const jamS = (l.jam_selesai || '').slice(0, 5);
          let dur = Number(l.durasi_jam || 0);
          if ((!dur || dur === 0) && jamM && jamS) {
            const [h1, m1] = jamM.split(':').map(Number);
            const [h2, m2] = jamS.split(':').map(Number);
            if (!isNaN(h1) && !isNaN(h2)) {
              let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
              if (mins < 0) mins += 24 * 60;
              dur = mins / 60;
            }
          }
          return {
            id: l.id,
            nik: l.nik,
            nama: l.nama,
            divisi: l.divisi,
            tanggal: l.tanggal,
            deskripsi: l.deskripsi,
            jamMulai: jamM,
            jamSelesai: jamS,
            durasiJam: dur,
            totalJam: dur > 0 ? `${dur % 1 === 0 ? dur.toFixed(0) : dur.toFixed(2)} Jam` : '-',
            rateLembur: Number(l.rate_lembur || 0),
            totalLembur: Number(l.total_lembur || 0),
            status: l.status,
            approvedBy: l.approved_by || '',
            catatan: l.catatan || ''
          };
        })
      };
    }

    case 'saveLembur': {
      const list = (payload.lemburList || [payload.lembur || payload]).map(l => {
        const jamM = l.jamMulai || '';
        const jamS = l.jamSelesai || '';
        let dur = Number(l.durasiJam || 0);
        if ((!dur || dur === 0) && jamM && jamS) {
          const [h1, m1] = jamM.split(':').map(Number);
          const [h2, m2] = jamS.split(':').map(Number);
          if (!isNaN(h1) && !isNaN(h2)) {
            let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
            if (mins < 0) mins += 24 * 60;
            dur = mins / 60;
          }
        }
        return {
          id: l.id || 'LMB-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          nik: l.nik,
          nama: l.nama,
          divisi: l.divisi,
          tanggal: l.tanggal,
          deskripsi: l.deskripsi,
          jam_mulai: jamM.length === 5 ? jamM + ':00' : jamM,
          jam_selesai: jamS.length === 5 ? jamS + ':00' : jamS,
          durasi_jam: dur,
          rate_lembur: Number(l.rateLembur || 0),
          total_lembur: Number(l.totalLembur || (dur * Number(l.rateLembur || 0))),
          status: 'Diajukan',
          catatan: l.catatan || ''
        };
      });
      await supabaseFetch('lembur?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: list
      });
      
      // Background GAS Webhook
      fetch(GOOGLE_SHEET_WEB_APP_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: JSON.stringify({ action: 'notifyLembur', lemburList: list }) }) 
      }).catch(() => {});

      return { success: true, message: 'Pengajuan lembur berhasil disimpan' };
    }

    case 'updateLemburStatus': {
      await supabaseFetch(`lembur?id=eq.${encodeURIComponent(payload.id)}`, {
        method: 'PATCH',
        body: {
          status: payload.status,
          approved_by: payload.approvedBy || (state.currentUser ? state.currentUser.nama : 'Admin'),
          approved_at: new Date().toISOString()
        }
      });
      return { success: true, message: `Status lembur berhasil diupdate menjadi ${payload.status}` };
    }

    case 'editLembur': {
      const l = payload.lembur || payload;
      const jamM = l.jamMulai || '';
      const jamS = l.jamSelesai || '';
      let dur = Number(l.durasiJam || 0);
      if ((!dur || dur === 0) && jamM && jamS) {
        const [h1, m1] = jamM.split(':').map(Number);
        const [h2, m2] = jamS.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
          if (mins < 0) mins += 24 * 60;
          dur = mins / 60;
        }
      }
      await supabaseFetch(`lembur?id=eq.${encodeURIComponent(l.id)}`, {
        method: 'PATCH',
        body: {
          tanggal: l.tanggal,
          deskripsi: l.deskripsi,
          jam_mulai: jamM.length === 5 ? jamM + ':00' : jamM,
          jam_selesai: jamS.length === 5 ? jamS + ':00' : jamS,
          durasi_jam: dur,
          rate_lembur: Number(l.rateLembur || 0),
          total_lembur: Number(l.totalLembur || (dur * Number(l.rateLembur || 0))),
          catatan: l.catatan || ''
        }
      });
      return { success: true, message: 'Data lembur berhasil diperbarui' };
    }

    case 'deleteLembur': {
      await supabaseFetch(`lembur?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      return { success: true, message: 'Data lembur berhasil dihapus' };
    }

    case 'getPerijinan': {
      const data = await supabaseFetch('perijinan_cuti?order=tgl_mulai.desc');
      return {
        success: true,
        data: data.map(c => ({
          id: c.id,
          nik: c.nik,
          nama: c.nama,
          divisi: c.divisi,
          jenis: c.jenis,
          tglMulai: c.tgl_mulai,
          tglSelesai: c.tgl_selesai || c.tgl_mulai,
          tanggalMulai: c.tgl_mulai,
          tanggalSelesai: c.tgl_selesai || c.tgl_mulai,
          jumlahHari: c.jumlah_hari,
          alasan: c.alasan,
          status: c.status,
          approvedBy: c.approved_by || '',
          catatan: c.catatan || ''
        }))
      };
    }

    case 'savePerijinan': {
      const list = (payload.cutiList || [payload.cuti || payload]).map(c => ({
        id: c.id || 'CUTI-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        nik: c.nik,
        nama: c.nama,
        divisi: c.divisi,
        jenis: c.jenis || 'Cuti Tahunan',
        tgl_mulai: c.tglMulai,
        tgl_selesai: c.tglSelesai || c.tglMulai,
        jumlah_hari: Number(c.jumlahHari || 1),
        alasan: c.alasan,
        status: 'Diajukan',
        catatan: c.catatan || ''
      }));
      await supabaseFetch('perijinan_cuti?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: list
      });

      // Background GAS Webhook
      fetch(GOOGLE_SHEET_WEB_APP_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ data: JSON.stringify({ action: 'notifyCuti', cutiList: list }) }) 
      }).catch(() => {});

      return { success: true, message: 'Pengajuan cuti berhasil disimpan' };
    }

    case 'updateCutiStatus': {
      await supabaseFetch(`perijinan_cuti?id=eq.${encodeURIComponent(payload.id)}`, {
        method: 'PATCH',
        body: {
          status: payload.status,
          approved_by: payload.approvedBy || (state.currentUser ? state.currentUser.nama : 'Admin'),
          approved_at: new Date().toISOString(),
          catatan: payload.catatan || ''
        }
      });
      return { success: true, message: `Status ijin/cuti berhasil diupdate menjadi ${payload.status}` };
    }

    case 'deleteCuti': {
      await supabaseFetch(`perijinan_cuti?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      return { success: true, message: 'Data cuti berhasil dihapus' };
    }

    case 'getKasbon': {
      const data = await supabaseFetch('kasbon?select=*,karyawan(nama,divisi)&order=tanggal.desc');
      return {
        success: true,
        data: data.map(k => ({
          id: k.id,
          nik: k.nik,
          nama: k.karyawan ? k.karyawan.nama : k.nik,
          divisi: k.karyawan ? k.karyawan.divisi : '',
          tanggal: k.tanggal,
          jumlah: Number(k.jumlah || 0),
          cicilan: Number(k.cicilan || 0),
          sisaSaldo: Number(k.sisa_saldo || 0),
          status: k.status,
          catatan: k.catatan || ''
        }))
      };
    }

    case 'saveKasbon': {
      const k = payload.kasbon || payload;
      const row = {
        id: k.id || 'KSB-' + Date.now(),
        nik: k.nik,
        tanggal: k.tanggal,
        jumlah: Number(k.jumlah || 0),
        cicilan: Number(k.cicilan || 0),
        sisa_saldo: Number(k.jumlah || 0),
        status: 'Aktif',
        catatan: k.catatan || ''
      };
      await supabaseFetch('kasbon?on_conflict=id', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: [row]
      });
      
      const userData = await supabaseFetch(`karyawan?nik=eq.${encodeURIComponent(k.nik)}&select=saldo_kasbon`);
      const currentSaldo = Number(userData[0]?.saldo_kasbon || 0);
      await supabaseFetch(`karyawan?nik=eq.${encodeURIComponent(k.nik)}`, {
        method: 'PATCH',
        body: { saldo_kasbon: currentSaldo + Number(k.jumlah || 0) }
      });

      return { success: true, message: 'Kasbon berhasil disimpan' };
    }

    case 'deleteKasbon': {
      await supabaseFetch(`kasbon?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      return { success: true, message: 'Data kasbon berhasil dihapus' };
    }

    case 'getPayroll': {
      const filter = payload.periode ? `&periode=eq.${encodeURIComponent(payload.periode)}` : '';
      const data = await supabaseFetch(`payroll?order=periode.desc${filter}`);
      return {
        success: true,
        data: data.map(p => ({
          id: p.id,
          periode: p.periode,
          nik: p.nik,
          nama: p.nama,
          divisi: p.divisi,
          gajiPokok: Number(p.gaji_pokok || 0),
          tunjangan: Number(p.tunjangan || 0),
          totalJamLembur: Number(p.total_jam_lembur || 0),
          rateLembur: Number(p.rate_lembur || 0),
          uangLembur: Number(p.uang_lembur || 0),
          potonganKasbon: Number(p.potongan_kasbon || 0),
          potonganAbsensi: Number(p.potongan_absensi || 0),
          potonganLain: Number(p.potongan_lain || 0),
          gajiBersih: Number(p.gaji_bersih || 0),
          status: p.status,
          catatan: p.catatan || ''
        }))
      };
    }

    case 'savePayrollBulk': {
      const rows = (payload.payrollList || payload.data || []).map(p => ({
        id: p.id || `PAY-${p.periode}-${p.nik}`,
        periode: p.periode,
        nik: p.nik,
        nama: p.nama,
        divisi: p.divisi,
        gaji_pokok: Number(p.gajiPokok || 0),
        tunjangan: Number(p.tunjangan || 0),
        total_jam_lembur: Number(p.totalJamLembur || 0),
        rate_lembur: Number(p.rateLembur || 0),
        uang_lembur: Number(p.uangLembur || 0),
        potongan_kasbon: Number(p.potonganKasbon || 0),
        potongan_absensi: Number(p.potonganAbsensi || 0),
        potongan_lain: Number(p.potonganLain || 0),
        gaji_bersih: Number(p.gajiBersih || 0),
        status: p.status || 'Draft',
        catatan: p.catatan || ''
      }));
      await supabaseFetch('payroll?on_conflict=periode,nik', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: rows
      });
      return { success: true, message: `${rows.length} data payroll berhasil disimpan` };
    }

    case 'updatePayrollAdjustment': {
      const p = payload.adj || payload;
      await supabaseFetch(`payroll?id=eq.${encodeURIComponent(p.id)}`, {
        method: 'PATCH',
        body: {
          gaji_pokok: Number(p.gajiPokok || 0),
          tunjangan: Number(p.tunjangan || 0),
          total_jam_lembur: Number(p.totalJamLembur || 0),
          rate_lembur: Number(p.rateLembur || 0),
          uang_lembur: Number(p.uangLembur || 0),
          potongan_kasbon: Number(p.potonganKasbon || 0),
          potongan_absensi: Number(p.potonganAbsensi || 0),
          potongan_lain: Number(p.potonganLain || 0),
          gaji_bersih: Number(p.gajiBersih || 0),
          catatan: p.catatan || '',
          updated_at: new Date().toISOString()
        }
      });
      return { success: true, message: 'Penyesuaian payroll berhasil disimpan' };
    }

    case 'approvePayrollFinance': {
      await supabaseFetch(`payroll?periode=eq.${encodeURIComponent(payload.periode)}`, {
        method: 'PATCH',
        body: {
          status: 'Disetujui Finance',
          approved_at: new Date().toISOString()
        }
      });
      return { success: true, message: `Payroll periode ${payload.periode} telah disetujui & diajukan ke Finance` };
    }

    default:
      throw new Error(`Aksi tidak dikenali di Supabase adapter: ${action}`);
  }
}

// ================= THEME =================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  htmlEl.setAttribute('data-theme', savedTheme);
  themeToggleBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}
themeToggleBtn.addEventListener('click', () => {
  const current = htmlEl.getAttribute('data-theme');
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  htmlEl.setAttribute('data-theme', nextTheme);
  themeToggleBtn.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', nextTheme);
});

// ================= FORMATTERS & HELPERS =================
function formatRupiah(num) {
  const val = Number(num || 0);
  return 'Rp ' + val.toLocaleString('id-ID');
}

function formatDate(val) {
  if (!val) return '-';
  return String(val);
}

function calculateOvertime(mulai, selesai) {
  if (!mulai || !selesai) return '0.00';
  const tStart = new Date(`2000-01-01T${mulai}:00`);
  let tEnd = new Date(`2000-01-01T${selesai}:00`);
  if (tEnd < tStart) {
    tEnd = new Date(`2000-01-02T${selesai}:00`);
  }
  const diffHours = (tEnd - tStart) / (1000 * 60 * 60);
  return diffHours > 0 ? diffHours.toFixed(2) : '0.00';
}

function formatWaNumber(num) {
  if (!num) return '';
  let clean = String(num).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  if (clean.startsWith('8')) clean = '62' + clean;
  return clean;
}

// ================= LIVE CLOCK =================
function startLiveClock() {
  function update() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour12: false });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const timeEl = document.getElementById('liveClockTime');
    const dateEl = document.getElementById('liveClockDate');
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
  }
  update();
  setInterval(update, 1000);
}

// ================= SHIFT RULES & ROSTER DASHBOARD =================
function getShiftScheduleForDate(shiftName, dateObj) {
  const day = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
  if (day === 0) {
    return { shift: 'Libur', masuk: '-', pulang: '-', isOff: true };
  }

  const sNorm = String(shiftName || 'Shift 1').trim();
  if (sNorm.includes('3')) {
    if (day === 6) { // Sabtu
      return { shift: 'Shift 3 (Sabtu)', masuk: '11:00', pulang: '20:00', isOff: false };
    }
    return { shift: 'Shift 3', masuk: '12:00', pulang: '21:00', isOff: false };
  }
  if (sNorm.includes('2')) {
    return { shift: 'Shift 2', masuk: '09:00', pulang: '18:00', isOff: false };
  }
  return { shift: 'Shift 1', masuk: '08:00', pulang: '17:00', isOff: false };
}

async function loadRosterShifts() {
  const res = await apiRequest('getRosterShifts', {
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik,
    role: state.currentUser.role
  });
  if (res) {
    state.roster = res.data || [];
    renderEmployeeShiftDashboard();
    if (state.currentUser.role === 'admin') renderAdminRosterTable();
  }
}

function renderEmployeeShiftDashboard() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const myRosterToday = state.roster.find(r => String(r.nik).trim() === String(state.currentUser.nik).trim() && r.tanggal === todayStr);

  const defaultShift = myRosterToday ? myRosterToday.shift : 'Shift 1';
  const schedule = myRosterToday 
    ? { shift: myRosterToday.shift, masuk: myRosterToday.jamMasuk, pulang: myRosterToday.jamPulang, isOff: myRosterToday.shift.toLowerCase().includes('libur') }
    : getShiftScheduleForDate(defaultShift, today);

  // Update Badge & Box
  const badgeEl = document.getElementById('userShiftBadge');
  const textEl = document.getElementById('todayShiftScheduleText');
  const noteEl = document.getElementById('todayShiftNote');

  if (badgeEl) {
    badgeEl.textContent = `${schedule.shift} (${schedule.masuk} - ${schedule.pulang})`;
    badgeEl.className = `status ${schedule.isOff ? 'ditolak' : 'disetujui'}`;
  }
  if (textEl) {
    textEl.textContent = schedule.isOff ? 'HARI INI LIBUR' : `${schedule.masuk} - ${schedule.pulang}`;
    textEl.style.color = schedule.isOff ? 'var(--error)' : 'var(--accent-primary)';
  }
  if (noteEl) {
    noteEl.textContent = schedule.isOff ? 'Selamat beristirahat!' : `Toleransi keterlambatan: 15 menit`;
  }

  // Render 7-day Upcoming Roster Timeline
  const timelineEl = document.getElementById('weeklyRosterTimeline');
  if (timelineEl) {
    const days = [];
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const rosterItem = state.roster.find(r => String(r.nik).trim() === String(state.currentUser.nik).trim() && r.tanggal === dStr);
      
      const sc = rosterItem 
        ? { shift: rosterItem.shift, masuk: rosterItem.jamMasuk, pulang: rosterItem.jamPulang, isOff: rosterItem.shift.toLowerCase().includes('libur') }
        : getShiftScheduleForDate(defaultShift, d);

      days.push(`
        <div class="roster-day-card ${i === 0 ? 'today' : ''}">
          <span class="roster-day-date">${dStr.slice(5)}</span>
          <span class="roster-day-name">${dayNames[d.getDay()]}</span>
          <span class="roster-shift-pill ${sc.isOff ? 'off' : ''}">
            ${sc.isOff ? 'LIBUR' : `${sc.shift.replace('Shift ', 'S')}<br>${sc.masuk}-${sc.pulang}`}
          </span>
        </div>
      `);
    }
    timelineEl.innerHTML = days.join('');
  }
}

function renderAdminRosterTable() {
  const wrap = document.getElementById('adminRosterTableWrap');
  if (!wrap) return;

  if (!state.roster.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada jadwal roster karyawan. Gunakan tombol <strong>Import CSV Roster</strong> di atas.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Shift</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Keterangan</th><th>Aksi</th></tr></thead>
      <tbody>
        ${state.roster.map(r => `
          <tr>
            <td><strong>${r.nik}</strong><br><small>${r.nama}</small></td>
            <td><span class="mono-text">${r.tanggal}</span></td>
            <td><strong>${r.shift}</strong></td>
            <td><span class="mono-text">${r.jamMasuk}</span></td>
            <td><span class="mono-text">${r.jamPulang}</span></td>
            <td>${r.keterangan || '-'}</td>
            <td class="action-cell">
              <button class="action-btn delete" onclick="deleteRosterShiftRecord('${r.id}')">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.deleteRosterShiftRecord = async (id) => {
  if (confirm('Hapus entri roster ini?')) {
    await apiRequest('deleteRosterShift', { id });
    loadRosterShifts();
  }
};

// ================= PRESENSI & ABSENSI =================
async function loadAbsensi() {
  const res = await apiRequest('getAbsensi', { 
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik, 
    role: state.currentUser.role 
  });
  if (res) {
    state.absensi = res.data || [];
    renderUserAbsensi();
    if (state.currentUser.role === 'admin') renderAdminAbsensi();
  }
}

async function loadShifts() {
  const res = await apiRequest('getShifts');
  if (res) {
    state.shifts = res.data || [];
    renderShiftDropdowns();
    if (state.currentUser.role === 'admin') renderShiftTable();
  }
}

function renderShiftDropdowns() {
  const userSelect = document.getElementById('userActiveShiftSelect');
  const manualSelect = document.getElementById('m_abs_shift');
  
  const shiftList = (state.shifts && state.shifts.length) ? state.shifts : [
    { namaShift: 'Shift 1', jamMasuk: '08:00', jamPulang: '17:00', toleransi: 15 },
    { namaShift: 'Shift 2', jamMasuk: '09:00', jamPulang: '18:00', toleransi: 15 },
    { namaShift: 'Shift 3', jamMasuk: '12:00', jamPulang: '21:00', toleransi: 15 }
  ];

  const optionsHtml = shiftList.map(s => `
    <option value="${s.namaShift}" data-masuk="${s.jamMasuk}" data-pulang="${s.jamPulang}" data-tol="${s.toleransi || s.toleransiMenit || 15}">
      ${s.namaShift} (${s.jamMasuk} - ${s.jamPulang})
    </option>
  `).join('');

  if (userSelect) {
    userSelect.innerHTML = optionsHtml;
  }
  if (manualSelect) {
    manualSelect.innerHTML = optionsHtml;
  }
}

function renderUserAbsensi() {
  const today = new Date().toISOString().split('T')[0];
  const userToday = state.absensi.find(a => String(a.nik).trim() === String(state.currentUser.nik).trim() && a.tanggal === today);
  
  const statusBox = document.getElementById('todayAttendanceStatusBox');
  if (statusBox) {
    if (userToday) {
      statusBox.innerHTML = `✅ <strong>Presensi Masuk:</strong> ${userToday.jamMasuk} | <strong>Pulang:</strong> ${userToday.jamPulang || 'Belum Presensi Pulang'} (${userToday.status})`;
      statusBox.style.color = 'var(--success)';
    } else {
      statusBox.innerHTML = `⚠️ Anda belum melakukan presensi masuk hari ini.`;
      statusBox.style.color = 'var(--warning)';
    }
  }

  const wrap = document.getElementById('userAbsensiTableWrap');
  if (!wrap) return;

  const saya = state.absensi.filter(a => String(a.nik).trim() === String(state.currentUser.nik).trim());
  if (!saya.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada riwayat presensi.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Tanggal</th><th>Shift</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Status</th><th>Keterlambatan</th></tr></thead>
      <tbody>
        ${saya.map(a => `
          <tr>
            <td><span class="mono-text">${a.tanggal}</span></td>
            <td><strong>${a.shift}</strong></td>
            <td><span class="mono-text">${a.jamMasuk || '-'}</span></td>
            <td><span class="mono-text">${a.jamPulang || '-'}</span></td>
            <td><span class="status ${a.status === 'Hadir' ? 'disetujui' : 'ditolak'}">${a.status}</span></td>
            <td><span class="mono-text">${Number(a.keterlambatanMenit || 0) > 0 ? a.keterlambatanMenit + ' menit' : '-'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAdminAbsensi() {
  const wrap = document.getElementById('adminAllAbsensiTableWrap');
  if (!wrap) return;

  if (!state.absensi.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada data presensi karyawan.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Shift</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Terlambat</th><th>Aksi</th></tr></thead>
      <tbody>
        ${state.absensi.map(a => `
          <tr>
            <td><strong>${a.nik}</strong><br><small>${a.nama}</small></td>
            <td><span class="mono-text">${a.tanggal}</span></td>
            <td>${a.shift}</td>
            <td><span class="mono-text">${a.jamMasuk || '-'}</span></td>
            <td><span class="mono-text">${a.jamPulang || '-'}</span></td>
            <td><span class="status ${a.status === 'Hadir' ? 'disetujui' : 'ditolak'}">${a.status}</span></td>
            <td><span class="mono-text">${Number(a.keterlambatanMenit || 0) > 0 ? a.keterlambatanMenit + ' mnt' : '-'}</span></td>
            <td class="action-cell">
              <button class="action-btn delete" onclick="deleteAbsensiRecord('${a.id}')">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Check-in & Check-out events with button loading state
document.getElementById('btnCheckIn').addEventListener('click', async () => {
  const btn = document.getElementById('btnCheckIn');
  setButtonLoading(btn, true, 'Memproses Masuk...');

  const select = document.getElementById('userActiveShiftSelect');
  const opt = select ? select.selectedOptions[0] : null;

  const payload = {
    nik: state.currentUser.nik,
    nama: state.currentUser.nama,
    shift: opt ? opt.value : 'Shift 1',
    shiftJamMasuk: opt ? opt.dataset.masuk : '08:00',
    toleransi: opt ? opt.dataset.tol : '15'
  };

  const res = await apiRequest('checkInAbsensi', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Presensi Masuk Berhasil!');
    loadAbsensi();
  }
});

document.getElementById('btnCheckOut').addEventListener('click', async () => {
  const btn = document.getElementById('btnCheckOut');
  setButtonLoading(btn, true, 'Memproses Pulang...');

  const res = await apiRequest('checkOutAbsensi', { nik: state.currentUser.nik });
  setButtonLoading(btn, false);
  if (res) {
    showToast('Presensi Pulang Berhasil!');
    loadAbsensi();
  }
});

window.deleteAbsensiRecord = async (id) => {
  if (confirm('Hapus log presensi ini?')) {
    await apiRequest('deleteAbsensi', { id });
    loadAbsensi();
  }
};

// ================= SHIFT MASTER =================
function renderShiftTable() {
  const wrap = document.getElementById('adminShiftTableWrap');
  if (!wrap) return;

  const shiftList = (state.shifts && state.shifts.length) ? state.shifts : [
    { id: '1', namaShift: 'Shift 1', jamMasuk: '08:00', jamPulang: '17:00', toleransi: 15, status: 'Aktif' },
    { id: '2', namaShift: 'Shift 2', jamMasuk: '09:00', jamPulang: '18:00', toleransi: 15, status: 'Aktif' },
    { id: '3', namaShift: 'Shift 3', jamMasuk: '12:00', jamPulang: '21:00', toleransi: 15, status: 'Aktif' }
  ];

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Nama Shift</th><th>Jam Kerja</th><th>Toleransi</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>
        ${shiftList.map(s => {
          const shiftKey = s.id || s.namaShift;
          return `
            <tr>
              <td><strong>${s.namaShift}</strong></td>
              <td><span class="mono-text">${s.jamMasuk} - ${s.jamPulang}</span></td>
              <td><span class="mono-text">${s.toleransi || s.toleransiMenit || 15} menit</span></td>
              <td><span class="status ${s.status === 'Aktif' ? 'disetujui' : 'ditolak'}">${s.status || 'Aktif'}</span></td>
              <td class="action-cell">
                <div class="action-cell-group">
                  <button class="action-btn edit" onclick="openEditShift('${shiftKey}')">Edit</button>
                  <button class="action-btn delete" onclick="deleteShift('${shiftKey}')">Hapus</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function openEditShift(idOrName) {
  const s = state.shifts.find(x => String(x.id) === String(idOrName) || x.namaShift === idOrName);
  if (!s) return;
  document.getElementById('shift_id').value = s.id || '';
  document.getElementById('shift_nama').value = s.namaShift || '';
  document.getElementById('shift_jamMasuk').value = s.jamMasuk || '';
  document.getElementById('shift_jamPulang').value = s.jamPulang || '';
  document.getElementById('shift_toleransi').value = s.toleransi || s.toleransiMenit || 15;
  document.getElementById('shift_status').value = s.status || 'Aktif';
  document.getElementById('addShiftModal').classList.remove('hidden');
}

async function deleteShift(idOrName) {
  const s = state.shifts.find(x => String(x.id) === String(idOrName) || x.namaShift === idOrName);
  const name = s ? s.namaShift : idOrName;
  if (!confirm(`Apakah Anda yakin ingin menghapus "${name}" dari Master Shift?`)) return;

  const res = await apiRequest('deleteShift', { id: s ? (s.id || s.namaShift) : idOrName });
  if (res) {
    showToast(`Shift ${name} berhasil dihapus!`);
    loadShifts();
  }
}

document.getElementById('btnOpenAddShiftModal').addEventListener('click', () => {
  document.getElementById('addShiftForm').reset();
  document.getElementById('shift_id').value = '';
  document.getElementById('addShiftModal').classList.remove('hidden');
});

document.getElementById('addShiftForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveShift');
  setButtonLoading(btn, true, 'Menyimpan...');

  const payload = {
    id: document.getElementById('shift_id').value,
    namaShift: document.getElementById('shift_nama').value,
    jamMasuk: document.getElementById('shift_jamMasuk').value,
    jamPulang: document.getElementById('shift_jamPulang').value,
    toleransiMenit: document.getElementById('shift_toleransi').value,
    status: document.getElementById('shift_status').value
  };

  const res = await apiRequest('saveShift', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Shift berhasil disimpan!');
    closeModal('addShiftModal');
    loadShifts();
  }
});

// ================= CSV IMPORT / EXPORT SHIFT ROSTER =================
function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

document.getElementById('btnDownloadShiftTemplate').addEventListener('click', () => {
  const today = new Date();
  const startStr = today.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setDate(end.getDate() + 6); // default 7 hari
  const endStr = end.toISOString().slice(0, 10);

  const startInput = document.getElementById('tpl_shift_start_date');
  const endInput = document.getElementById('tpl_shift_end_date');
  if (startInput) startInput.value = startStr;
  if (endInput) endInput.value = endStr;

  document.getElementById('downloadShiftTemplateModal').classList.remove('hidden');
});

function executeDownloadShiftTemplate() {
  const startVal = document.getElementById('tpl_shift_start_date').value;
  const endVal = document.getElementById('tpl_shift_end_date').value;
  if (!startVal || !endVal) return showToast('Pilih tanggal mulai dan tanggal selesai!', 'error');

  const startDate = new Date(startVal);
  const endDate = new Date(endVal);
  if (endDate < startDate) return showToast('Tanggal selesai tidak boleh sebelum tanggal mulai!', 'error');

  const dates = [];
  const curr = new Date(startDate);
  while (curr <= endDate) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setDate(curr.getDate() + 1);
  }

  if (dates.length > 62) {
    return showToast('Maksimal rentang tanggal adalah 62 hari (2 bulan)!', 'error');
  }

  // Format Header: Nama,ID,2026-08-01,2026-08-02,...
  const header = `Nama,ID,${dates.join(',')}\n`;
  
  // Data Seluruh Karyawan
  const users = state.users && state.users.length ? state.users : [
    { nama: 'Effendy', nik: 'WH0001' },
    { nama: 'Sasi Novita', nik: 'WH0002' },
    { nama: 'Irma', nik: 'WH0003' }
  ];

  const rows = users.map(u => {
    const shiftCols = dates.map(d => {
      const day = new Date(d).getDay();
      return day === 0 ? '"Libur"' : '"Shift 1"';
    }).join(',');
    return `"${u.nama || ''}","${u.nik || ''}",${shiftCols}`;
  }).join('\n');

  downloadCsv(`template_roster_shift_${startVal}_sd_${endVal}.csv`, header + rows);
  closeModal('downloadShiftTemplateModal');
  showToast(`Template CSV berhasil diunduh (${dates.length} tanggal, ${users.length} karyawan)`);
}

document.getElementById('btnExportShiftCsv').addEventListener('click', () => {
  if (!state.roster.length) return showToast('Belum ada data roster untuk diexport!', 'error');
  const header = 'NIK,Nama,Tanggal,Shift,JamMasuk,JamPulang,Keterangan\n';
  const rows = state.roster.map(r => `"${r.nik}","${r.nama}","${r.tanggal}","${r.shift}","${r.jamMasuk}","${r.jamPulang}","${r.keterangan || ''}"`).join('\n');
  downloadCsv('export_roster_shift_warehouse.csv', header + rows);
});

document.getElementById('btnOpenImportShiftModal').addEventListener('click', () => {
  document.getElementById('shiftCsvFileInput').value = '';
  document.getElementById('shiftImportPreviewWrap').style.display = 'none';
  document.getElementById('btnExecuteImportShift').disabled = true;
  state.pendingShiftImport = [];
  document.getElementById('importShiftModal').classList.remove('hidden');
});

document.getElementById('shiftCsvFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l !== '');
    if (lines.length < 2) return showToast('File CSV kosong atau tidak valid', 'error');

    // Helper untuk mencari jam masuk & pulang dari master_shift
    function resolveShiftHours(shiftName) {
      const sName = String(shiftName || '').trim();
      const sLower = sName.toLowerCase();
      if (!sName || sLower === '-' || sLower === 'libur' || sLower === 'off' || sLower === 'cuti') {
        return { shift: sName || 'Libur', jamMasuk: '', jamPulang: '' };
      }
      const matched = state.shifts.find(s => s.namaShift.toLowerCase().trim() === sLower);
      if (matched) {
        return { shift: matched.namaShift, jamMasuk: matched.jamMasuk, jamPulang: matched.jamPulang };
      }
      // Partial match (e.g. "shift 1", "shift1", "1")
      const partial = state.shifts.find(s => s.namaShift.toLowerCase().replace(/\s+/g, '') === sLower.replace(/\s+/g, ''));
      if (partial) {
        return { shift: partial.namaShift, jamMasuk: partial.jamMasuk, jamPulang: partial.jamPulang };
      }
      return { shift: sName, jamMasuk: '08:00', jamPulang: '17:00' };
    }

    const rawHeaders = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim());
    const lowerHeaders = rawHeaders.map(h => h.toLowerCase());
    const parsed = [];

    // Deteksi apakah format Matrix (ada kolom tanggal YYYY-MM-DD di header)
    const dateColIndexes = [];
    rawHeaders.forEach((h, idx) => {
      if (/\d{4}-\d{2}-\d{2}/.test(h) || /\d{2}-\d{2}-\d{4}/.test(h) || /tgl_\d{4}-\d{2}-\d{2}/i.test(h)) {
        let dateStr = h.replace(/^tgl_/i, '').trim();
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split('-');
          dateStr = `${y}-${m}-${d}`;
        }
        dateColIndexes.push({ idx, date: dateStr });
      }
    });

    if (dateColIndexes.length > 0) {
      // 1. FORMAT MATRIX: Nama, ID, Tgl1, Tgl2, ...
      let nikCol = lowerHeaders.findIndex(h => h === 'id' || h === 'nik' || h === 'id karyawan' || h === 'nik karyawan');
      let namaCol = lowerHeaders.findIndex(h => h === 'nama' || h === 'nama karyawan' || h === 'name');
      if (nikCol === -1) nikCol = 1;
      if (namaCol === -1) namaCol = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
        const nik = cols[nikCol] || '';
        const nama = cols[namaCol] || '';
        if (!nik) continue;

        dateColIndexes.forEach(({ idx, date }) => {
          const shiftVal = cols[idx];
          if (shiftVal && shiftVal !== '' && shiftVal !== '-') {
            const shiftInfo = resolveShiftHours(shiftVal);
            parsed.push({
              nik,
              nama,
              tanggal: date,
              shift: shiftInfo.shift,
              jamMasuk: shiftInfo.jamMasuk,
              jamPulang: shiftInfo.jamPulang,
              keterangan: shiftInfo.shift.toLowerCase().includes('libur') ? 'Libur' : ''
            });
          }
        });
      }
    } else {
      // 2. FORMAT FLAT LIST: NIK, Nama, Tanggal, Shift, [JamMasuk, JamPulang, Keterangan]
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length >= 3) {
          const nik = cols[0];
          const nama = cols[1] || '';
          const tanggal = cols[2];
          const shiftName = cols[3] || 'Shift 1';
          const shiftInfo = resolveShiftHours(shiftName);

          parsed.push({
            nik,
            nama,
            tanggal,
            shift: shiftInfo.shift,
            jamMasuk: cols[4] || shiftInfo.jamMasuk,
            jamPulang: cols[5] || shiftInfo.jamPulang,
            keterangan: cols[6] || ''
          });
        }
      }
    }

    if (!parsed.length) return showToast('Tidak ada data roster valid yang ditemukan dalam CSV', 'error');

    state.pendingShiftImport = parsed;
    const previewWrap = document.getElementById('shiftImportPreviewWrap');
    previewWrap.style.display = 'block';
    previewWrap.innerHTML = `
      <table>
        <thead><tr><th>NIK</th><th>Nama</th><th>Tanggal</th><th>Shift</th><th>Jam Masuk - Pulang</th></tr></thead>
        <tbody>
          ${parsed.slice(0, 8).map(p => `
            <tr>
              <td><span class="mono-text">${p.nik}</span></td>
              <td><strong>${p.nama}</strong></td>
              <td><span class="mono-text">${formatDate(p.tanggal)}</span></td>
              <td><span class="status disetujui">${p.shift}</span></td>
              <td><span class="mono-text">${p.jamMasuk && p.jamPulang ? (p.jamMasuk + ' - ' + p.jamPulang) : (p.shift || '-')}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <small style="display:block; padding: 8px 12px; color: var(--text-muted);">
        Total <strong>${parsed.length}</strong> jadwal roster karyawan siap di-import ke database.
      </small>
    `;

    document.getElementById('btnExecuteImportShift').disabled = false;
  };
  reader.readAsText(file);
});

document.getElementById('btnExecuteImportShift').addEventListener('click', async () => {
  if (!state.pendingShiftImport.length) return;
  const btn = document.getElementById('btnExecuteImportShift');
  setButtonLoading(btn, true, 'Mengimport...');

  const res = await apiRequest('importRosterShifts', { rosterList: state.pendingShiftImport });
  setButtonLoading(btn, false);
  if (res) {
    showToast(`Berhasil mengimport ${res.count || state.pendingShiftImport.length} jadwal roster!`);
    closeModal('importShiftModal');
    loadRosterShifts();
  }
});

// ================= CSV IMPORT / EXPORT KARYAWAN =================
document.getElementById('btnDownloadUserTemplate').addEventListener('click', () => {
  const header = 'NIK,Nama,Divisi,Username,Password,Role,Email,NoHP,GajiPokok,Tunjangan,RateLembur\n';
  const sample1 = 'WH0001,Admin Warehouse,Warehouse,admin,12345,admin,admin@warehouse.com,081234567890,4500000,500000,25000\n';
  const sample2 = 'WH0002,Budi Santoso,Inbound,budi,12345,user,budi@warehouse.com,081298765432,4200000,300000,25000\n';
  downloadCsv('template_data_karyawan_warehouse.csv', header + sample1 + sample2);
});

document.getElementById('btnExportUserCsv').addEventListener('click', () => {
  if (!state.users.length) return showToast('Belum ada data karyawan untuk diexport!', 'error');
  const header = 'NIK,Nama,Divisi,Username,Password,Role,Email,NoHP,GajiPokok,Tunjangan,RateLembur\n';
  const rows = state.users.map(u => `"${u.nik}","${u.nama}","${u.divisi}","${u.username}","${u.password || ''}","${u.role}","${u.email || ''}","${u.noHp || ''}",${u.gajiPokok || 0},${u.tunjangan || 0},${u.rateLembur || 25000}`).join('\n');
  downloadCsv('export_data_karyawan_warehouse.csv', header + rows);
});

document.getElementById('btnOpenImportUserModal').addEventListener('click', () => {
  document.getElementById('userCsvFileInput').value = '';
  document.getElementById('userImportPreviewWrap').style.display = 'none';
  document.getElementById('btnExecuteImportUser').disabled = true;
  state.pendingUserImport = [];
  document.getElementById('importUserModal').classList.remove('hidden');
});

document.getElementById('userCsvFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return showToast('File CSV kosong atau tidak valid', 'error');

    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 4) {
        parsed.push({
          nik: cols[0],
          nama: cols[1] || '',
          divisi: cols[2] || 'Warehouse',
          username: cols[3] || cols[0],
          password: cols[4] || '12345',
          role: cols[5] || 'user',
          email: cols[6] || '',
          noHp: cols[7] || '',
          gajiPokok: Number(cols[8] || 4000000),
          tunjangan: Number(cols[9] || 0),
          rateLembur: Number(cols[10] || 25000)
        });
      }
    }

    state.pendingUserImport = parsed;
    const previewWrap = document.getElementById('userImportPreviewWrap');
    previewWrap.style.display = 'block';
    previewWrap.innerHTML = `
      <table>
        <thead><tr><th>NIK</th><th>Nama</th><th>Divisi</th><th>Role</th><th>Gaji Pokok</th></tr></thead>
        <tbody>
          ${parsed.slice(0, 5).map(p => `<tr><td>${p.nik}</td><td>${p.nama}</td><td>${p.divisi}</td><td>${p.role}</td><td>${formatRupiah(p.gajiPokok)}</td></tr>`).join('')}
        </tbody>
      </table>
      <small style="display:block; padding: 6px 12px; color: var(--text-muted);">Total ${parsed.length} karyawan siap di-import.</small>
    `;

    document.getElementById('btnExecuteImportUser').disabled = false;
  };
  reader.readAsText(file);
});

document.getElementById('btnExecuteImportUser').addEventListener('click', async () => {
  if (!state.pendingUserImport.length) return;
  const btn = document.getElementById('btnExecuteImportUser');
  setButtonLoading(btn, true, 'Mengimport...');

  const res = await apiRequest('importUsersBulk', { userList: state.pendingUserImport });
  setButtonLoading(btn, false);
  if (res) {
    showToast(`Berhasil mengimport ${res.count || state.pendingUserImport.length} karyawan!`);
    closeModal('importUserModal');
    loadUsersData();
  }
});

// ================= KASBON KARYAWAN =================
async function loadKasbon() {
  const res = await apiRequest('getKasbon', { 
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik, 
    role: state.currentUser.role 
  });
  if (res) {
    state.kasbon = res.data || [];
    renderKasbonTable();
    updateUserKasbonStat();
  }
}

function updateUserKasbonStat() {
  const userActive = state.kasbon.filter(k => String(k.nik).trim() === String(state.currentUser.nik).trim() && k.status === 'Aktif');
  const total = userActive.reduce((acc, c) => acc + Number(c.sisaKasbon || 0), 0);
  const el = document.getElementById('userActiveKasbonAmount');
  if (el) el.textContent = formatRupiah(total);
}

function renderKasbonTable() {
  const wrap = document.getElementById('adminKasbonTableWrap');
  if (!wrap) return;

  if (!state.kasbon.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada data kasbon karyawan.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Pinjaman</th><th>Cicilan/Bulan</th><th>Sisa Kasbon</th><th>Status</th><th>Catatan</th><th>Aksi</th></tr></thead>
      <tbody>
        ${state.kasbon.map(k => `
          <tr>
            <td><strong>${k.nik}</strong><br><small>${k.nama}</small></td>
            <td><span class="mono-text">${k.tanggalPengajuan}</span></td>
            <td><span class="mono-text">${formatRupiah(k.jumlahPinjaman)}</span></td>
            <td><span class="mono-text">${formatRupiah(k.cicilanPerBulan)}</span></td>
            <td><strong class="mono-text" style="color: var(--warning);">${formatRupiah(k.sisaKasbon)}</strong></td>
            <td><span class="status ${k.status === 'Aktif' ? 'diajukan' : 'disetujui'}">${k.status}</span></td>
            <td>${k.catatan || '-'}</td>
            <td class="action-cell">
              <button class="action-btn delete" onclick="deleteKasbonRecord('${k.id}')">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

document.getElementById('btnOpenAddKasbonModal').addEventListener('click', () => {
  const select = document.getElementById('kasbon_nik');
  if (select) {
    select.innerHTML = state.users.filter(u => u.nik !== 'admin').map(u => `<option value="${u.nik}">${u.nik} - ${u.nama}</option>`).join('');
  }
  document.getElementById('addKasbonForm').reset();
  document.getElementById('kasbon_tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('addKasbonModal').classList.remove('hidden');
});

document.getElementById('addKasbonForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveKasbon');
  setButtonLoading(btn, true, 'Menyimpan...');

  const nik = document.getElementById('kasbon_nik').value;
  const user = state.users.find(u => u.nik === nik);

  const payload = {
    nik,
    nama: user ? user.nama : '',
    tanggalPengajuan: document.getElementById('kasbon_tanggal').value,
    jumlahPinjaman: document.getElementById('kasbon_jumlah').value,
    cicilanPerBulan: document.getElementById('kasbon_cicilan').value,
    catatan: document.getElementById('kasbon_catatan').value,
    status: 'Aktif'
  };

  const res = await apiRequest('saveKasbon', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Data kasbon berhasil disimpan!');
    closeModal('addKasbonModal');
    loadKasbon();
    loadUsersData();
  }
});

window.deleteKasbonRecord = async (id) => {
  if (confirm('Hapus data kasbon ini?')) {
    await apiRequest('deleteKasbon', { id });
    loadKasbon();
    loadUsersData();
  }
};

// ================= PAYROLL & AUDIT GAJI =================
async function loadPayroll() {
  const period = document.getElementById('payrollMonthPicker').value;
  const res = await apiRequest('getPayroll', { 
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik, 
    role: state.currentUser.role,
    periode: period
  });
  if (res) {
    state.payroll = res.data || [];
    renderPayrollTables();
    renderUserSlipGajiTable();
  }
}

function renderPayrollTables() {
  const wrap = document.getElementById('adminPayrollTableWrap');
  if (!wrap) return;

  if (!state.payroll.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada data payroll untuk periode ini. Klik <strong>⚡ Generate Payroll</strong> di atas.</p>`;
    updatePayrollMetrics(0, 0, 0, 'Belum Ada');
    return;
  }

  let totalGaji = 0;
  let totalLembur = 0;
  let totalKasbon = 0;
  let isApprovedAll = true;

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Karyawan</th>
          <th>Gaji Pokok</th>
          <th>Tunjangan</th>
          <th>Lembur (Jam × Rate)</th>
          <th>Uang Lembur</th>
          <th>Pot. Kasbon</th>
          <th>Pot. Absensi/Lain</th>
          <th>Gaji Bersih</th>
          <th>Status</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${state.payroll.map(p => {
          const gPokok = Number(p.gajiPokok || 0);
          const tunj = Number(p.tunjangan || 0);
          const uLembur = Number(p.totalUangLembur || 0);
          const potKasbon = Number(p.potonganKasbon || 0);
          const potLain = Number(p.potonganAbsensi || 0) + Number(p.potonganLain || 0);
          const gBersih = Number(p.gajiBersih || 0);

          totalGaji += gBersih;
          totalLembur += uLembur;
          totalKasbon += potKasbon;
          if (p.status !== 'Disetujui') isApprovedAll = false;

          return `
            <tr>
              <td><strong>${p.nik}</strong><br><small>${p.nama}</small></td>
              <td><span class="mono-text">${formatRupiah(gPokok)}</span></td>
              <td><span class="mono-text">${formatRupiah(tunj)}</span></td>
              <td><span class="mono-text">${p.totalJamLembur || 0} jam @${formatRupiah(p.rateLembur || 25000)}</span></td>
              <td><span class="mono-text" style="color: var(--success);">${formatRupiah(uLembur)}</span></td>
              <td><span class="mono-text" style="color: var(--warning);">${formatRupiah(potKasbon)}</span></td>
              <td><span class="mono-text" style="color: var(--error);">${formatRupiah(potLain)}</span></td>
              <td><strong class="mono-text" style="color: var(--accent-primary); font-size: 0.95rem;">${formatRupiah(gBersih)}</strong></td>
              <td><span class="status ${p.status === 'Disetujui' ? 'disetujui' : 'diajukan'}">${p.status || 'Draft'}</span></td>
              <td class="action-cell">
                <button class="action-btn edit" onclick="openEditPayrollModal('${p.id}')">Audit/Edit</button>
                <button class="action-btn view" onclick="openSlipGajiModal('${p.id}')">Slip</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  updatePayrollMetrics(totalGaji, totalLembur, totalKasbon, isApprovedAll ? 'Disetujui (Approved)' : 'Draft');
}

function updatePayrollMetrics(totalGaji, totalLembur, totalKasbon, statusStr) {
  document.getElementById('sumGajiBersih').textContent = formatRupiah(totalGaji);
  document.getElementById('sumUangLembur').textContent = formatRupiah(totalLembur);
  document.getElementById('sumPotonganKasbon').textContent = formatRupiah(totalKasbon);
  const statusEl = document.getElementById('payrollPeriodStatus');
  statusEl.textContent = statusStr;
  statusEl.className = `status ${statusStr.includes('Approved') || statusStr.includes('Disetujui') ? 'disetujui' : 'diajukan'}`;
}

document.getElementById('btnGeneratePayroll').addEventListener('click', async () => {
  const period = document.getElementById('payrollMonthPicker').value;
  if (!period) return showToast('Pilih bulan payroll terlebih dahulu!', 'error');

  // Hitung range tanggal: 26 bulan lalu s/d 25 bulan ini
  const [pYear, pMonth] = period.split('-').map(Number);
  const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
  const prevYear  = pMonth === 1 ? pYear - 1 : pYear;
  const startLabel = `26 ${new Date(prevYear, prevMonth - 1).toLocaleString('id-ID', {month:'long', year:'numeric'})}`;
  const endLabel   = `25 ${new Date(pYear, pMonth - 1).toLocaleString('id-ID', {month:'long', year:'numeric'})}`;
  const rangeLabel = `${startLabel} – ${endLabel}`;

  const btn = document.getElementById('btnGeneratePayroll');
  setButtonLoading(btn, true, 'Menghitung...');

  const res = await apiRequest('generateMonthlyPayroll', { 
    periode: period, 
    adminUsername: state.currentUser.username 
  });
  setButtonLoading(btn, false);
  if (res) {
    showToast(`Payroll periode ${rangeLabel} berhasil di-generate!`);
    loadPayroll();
  }
});

document.getElementById('btnApprovePayrollFinance').addEventListener('click', async () => {
  const period = document.getElementById('payrollMonthPicker').value;
  if (!confirm(`Setujui seluruh payroll periode ${period} untuk diajukan ke Finance?`)) return;

  const btn = document.getElementById('btnApprovePayrollFinance');
  setButtonLoading(btn, true, 'Menyetujui...');

  const res = await apiRequest('approvePayroll', { 
    periode: period, 
    adminUsername: state.currentUser.username 
  });
  setButtonLoading(btn, false);
  if (res) {
    showToast(`Payroll periode ${period} telah disetujui & siap dibayarkan!`);
    loadPayroll();
  }
});

window.openEditPayrollModal = (id) => {
  const p = state.payroll.find(x => x.id === id);
  if (!p) return;

  document.getElementById('adj_id').value = p.id;
  document.getElementById('adj_nama').textContent = p.nama;
  document.getElementById('adj_nik').textContent = `${p.nik} - Divisi: ${p.divisi}`;
  document.getElementById('adj_periode').textContent = p.periode;

  document.getElementById('adj_gajiPokok').value = p.gajiPokok;
  document.getElementById('adj_tunjangan').value = p.tunjangan;
  document.getElementById('adj_totalJamLembur').value = p.totalJamLembur;
  document.getElementById('adj_rateLembur').value = p.rateLembur || 25000;
  document.getElementById('adj_potonganKasbon').value = p.potonganKasbon;
  document.getElementById('adj_potonganAbsensi').value = p.potonganAbsensi || 0;
  document.getElementById('adj_potonganLain').value = p.potonganLain || 0;
  document.getElementById('adj_catatan').value = p.catatan || '';

  document.getElementById('editPayrollModal').classList.remove('hidden');
};

document.getElementById('editPayrollForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSavePayrollAdjustment');
  setButtonLoading(btn, true, 'Menyimpan...');

  const payload = {
    id: document.getElementById('adj_id').value,
    gajiPokok: document.getElementById('adj_gajiPokok').value,
    tunjangan: document.getElementById('adj_tunjangan').value,
    totalJamLembur: document.getElementById('adj_totalJamLembur').value,
    rateLembur: document.getElementById('adj_rateLembur').value,
    potonganKasbon: document.getElementById('adj_potonganKasbon').value,
    potonganAbsensi: document.getElementById('adj_potonganAbsensi').value,
    potonganLain: document.getElementById('adj_potonganLain').value,
    catatan: document.getElementById('adj_catatan').value,
    updatedBy: state.currentUser.username
  };

  const res = await apiRequest('savePayrollAdjustment', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Koreksi payroll berhasil disimpan!');
    closeModal('editPayrollModal');
    loadPayroll();
  }
});

// ================= SLIP GAJI KARYAWAN =================
function renderUserSlipGajiTable() {
  const wrap = document.getElementById('userSlipGajiTableWrap');
  if (!wrap) return;

  const saya = state.payroll.filter(p => String(p.nik).trim() === String(state.currentUser.nik).trim());
  if (!saya.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada slip gaji yang dirilis untuk Anda.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Periode Bulan</th><th>Gaji Pokok</th><th>Uang Lembur</th><th>Total Potongan</th><th>Gaji Diterima (Take Home Pay)</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>
        ${saya.map(p => {
          const totalPot = Number(p.potonganKasbon || 0) + Number(p.potonganAbsensi || 0) + Number(p.potonganLain || 0);
          return `
            <tr>
              <td><strong class="mono-text">${p.periode}</strong></td>
              <td><span class="mono-text">${formatRupiah(p.gajiPokok)}</span></td>
              <td><span class="mono-text" style="color: var(--success);">${formatRupiah(p.totalUangLembur)}</span></td>
              <td><span class="mono-text" style="color: var(--error);">${formatRupiah(totalPot)}</span></td>
              <td><strong class="mono-text" style="color: var(--accent-primary); font-size: 0.95rem;">${formatRupiah(p.gajiBersih)}</strong></td>
              <td><span class="status ${p.status === 'Disetujui' ? 'disetujui' : 'diajukan'}">${p.status || 'Draft'}</span></td>
              <td class="action-cell">
                <button class="action-btn view" onclick="openSlipGajiModal('${p.id}')">📄 Lihat Slip Gaji</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

window.openSlipGajiModal = (payrollId) => {
  const p = state.payroll.find(x => x.id === payrollId);
  if (!p) return;
  state.selectedSlip = p;

  const totalPot = Number(p.potonganKasbon || 0) + Number(p.potonganAbsensi || 0) + Number(p.potonganLain || 0);
  const totalPendapatan = Number(p.gajiPokok || 0) + Number(p.tunjangan || 0) + Number(p.totalUangLembur || 0);

  const container = document.getElementById('slipGajiContentArea');
  container.innerHTML = `
    <div class="slip-header-info">
      <div><strong>NIK:</strong> <span class="mono-text">${p.nik}</span></div>
      <div><strong>Periode:</strong> <span class="mono-text">${p.periode}</span></div>
      <div><strong>Nama:</strong> ${p.nama}</div>
      <div><strong>Status Slip:</strong> <span class="status ${p.status === 'Disetujui' ? 'disetujui' : 'diajukan'}">${p.status || 'Draft'}</span></div>
      <div><strong>Divisi:</strong> ${p.divisi}</div>
      <div><strong>Tanggal Terbit:</strong> <span class="mono-text">${formatDate(p.createdAt ? p.createdAt.split('T')[0] : '-')}</span></div>
    </div>

    <div class="slip-grid" style="margin-top: 14px;">
      <!-- PENERIMAAN -->
      <div class="slip-col">
        <h4 style="color: var(--success);">PENERIMAAN (EARNINGS)</h4>
        <div class="slip-line-item"><span>Gaji Pokok:</span><strong class="mono-text">${formatRupiah(p.gajiPokok)}</strong></div>
        <div class="slip-line-item"><span>Tunjangan Bulanan:</span><strong class="mono-text">${formatRupiah(p.tunjangan)}</strong></div>
        <div class="slip-line-item"><span>Uang Lembur (${p.totalJamLembur || 0} Jam):</span><strong class="mono-text">${formatRupiah(p.totalUangLembur)}</strong></div>
        <div class="slip-line-item" style="border-top: 1px solid var(--border-color); margin-top: 6px; padding-top: 6px;">
          <strong>Total Pendapatan:</strong><strong class="mono-text" style="color: var(--success);">${formatRupiah(totalPendapatan)}</strong>
        </div>
      </div>

      <!-- POTONGAN -->
      <div class="slip-col">
        <h4 style="color: var(--error);">POTONGAN (DEDUCTIONS)</h4>
        <div class="slip-line-item"><span>Cicilan Kasbon:</span><strong class="mono-text">${formatRupiah(p.potonganKasbon)}</strong></div>
        <div class="slip-line-item"><span>Potongan Absensi:</span><strong class="mono-text">${formatRupiah(p.potonganAbsensi || 0)}</strong></div>
        <div class="slip-line-item"><span>Potongan Lain / Denda:</span><strong class="mono-text">${formatRupiah(p.potonganLain || 0)}</strong></div>
        <div class="slip-line-item" style="border-top: 1px solid var(--border-color); margin-top: 6px; padding-top: 6px;">
          <strong>Total Potongan:</strong><strong class="mono-text" style="color: var(--error);">${formatRupiah(totalPot)}</strong>
        </div>
      </div>
    </div>

    <div class="slip-total-box" style="margin-top: 16px;">
      <div>
        <div class="total-title">GAJI BERSIH DITERIMA (TAKE HOME PAY)</div>
        <small style="color: var(--text-muted);">Ditransfer via Rekening / Kasir Finance</small>
      </div>
      <div class="total-amount">${formatRupiah(p.gajiBersih)}</div>
    </div>
  `;

  document.getElementById('viewSlipGajiModal').classList.remove('hidden');
};

document.getElementById('btnPrintSlipPdf').addEventListener('click', () => {
  if (!state.selectedSlip) return;
  exportSingleSlipPdf(state.selectedSlip);
});

function exportSingleSlipPdf(p) {
  if (!window.jspdf || !window.jspdf.jsPDF) return showToast('Library PDF belum siap', 'error');

  const doc = new window.jspdf.jsPDF();
  const totalPot = Number(p.potonganKasbon || 0) + Number(p.potonganAbsensi || 0) + Number(p.potonganLain || 0);
  const totalPendapatan = Number(p.gajiPokok || 0) + Number(p.tunjangan || 0) + Number(p.totalUangLembur || 0);

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('SLIP GAJI KARYAWAN', 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('WAREHOUSE MANAGEMENT SYSTEM', 14, 26);
  doc.line(14, 30, 196, 30);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`NIK: ${p.nik}`, 14, 38);
  doc.text(`Nama: ${p.nama}`, 14, 44);
  doc.text(`Divisi: ${p.divisi}`, 14, 50);

  doc.text(`Periode: ${p.periode}`, 130, 38);
  doc.text(`Status: ${p.status || 'Draft'}`, 130, 44);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 130, 50);

  doc.autoTable({
    startY: 56,
    head: [['PENERIMAAN (EARNINGS)', 'JUMLAH (RP)', 'POTONGAN (DEDUCTIONS)', 'JUMLAH (RP)']],
    body: [
      ['Gaji Pokok', formatRupiah(p.gajiPokok), 'Potongan Kasbon', formatRupiah(p.potonganKasbon)],
      ['Tunjangan Bulanan', formatRupiah(p.tunjangan), 'Potongan Absensi', formatRupiah(p.potonganAbsensi || 0)],
      [`Uang Lembur (${p.totalJamLembur || 0} Jam)`, formatRupiah(p.totalUangLembur), 'Potongan Lain', formatRupiah(p.potonganLain || 0)],
      ['TOTAL PENDAPATAN', formatRupiah(totalPendapatan), 'TOTAL POTONGAN', formatRupiah(totalPot)]
    ],
    theme: 'grid',
    headStyles: { fillColor: [56, 189, 248], textColor: [13, 17, 23], fontStyle: 'bold' }
  });

  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFillColor(240, 249, 255);
  doc.rect(14, finalY, 182, 16, 'F');
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text('GAJI BERSIH DITERIMA (TAKE HOME PAY):', 20, finalY + 11);
  doc.text(formatRupiah(p.gajiBersih), 140, finalY + 11);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Diserahkan oleh (Finance/Admin):', 25, finalY + 36);
  doc.text('Diterima oleh Karyawan:', 135, finalY + 36);
  doc.text('( ______________________ )', 25, finalY + 56);
  doc.text(`( ${p.nama} )`, 135, finalY + 56);

  doc.save(`Slip_Gaji_${p.periode}_${p.nik}_${p.nama.replace(/\s+/g, '_')}.pdf`);
}

// PDF Summary for Finance
document.getElementById('btnDownloadFinanceSummaryPdf').addEventListener('click', () => {
  if (!state.payroll.length) return showToast('Belum ada data payroll untuk diexport!', 'error');
  if (!window.jspdf || !window.jspdf.jsPDF) return showToast('Library PDF belum siap', 'error');

  const period = document.getElementById('payrollMonthPicker').value || 'Periode';
  const doc = new window.jspdf.jsPDF('landscape');

  doc.setFontSize(16);
  doc.text(`REKAPITULASI PEMBAYARAN GAJI KARYAWAN WAREHOUSE - PERIODE ${period}`, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Pengajuan Resmi ke Departemen Finance / Accounting', 14, 24);

  let sumBersih = 0;
  const rows = state.payroll.map((p, idx) => {
    sumBersih += Number(p.gajiBersih || 0);
    const pot = Number(p.potonganKasbon || 0) + Number(p.potonganAbsensi || 0) + Number(p.potonganLain || 0);
    return [
      idx + 1,
      p.nik,
      p.nama,
      p.divisi,
      formatRupiah(p.gajiPokok),
      formatRupiah(p.tunjangan),
      `${p.totalJamLembur || 0} jam`,
      formatRupiah(p.totalUangLembur),
      formatRupiah(pot),
      formatRupiah(p.gajiBersih),
      p.status || 'Draft'
    ];
  });

  doc.autoTable({
    startY: 28,
    head: [['No', 'NIK', 'Nama', 'Divisi', 'Gaji Pokok', 'Tunjangan', 'Jam Lembur', 'Uang Lembur', 'Potongan', 'Gaji Bersih', 'Status']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [56, 189, 248], textColor: [13, 17, 23] }
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0);
  doc.text(`TOTAL DANA GAJI DIBAYARKAN: ${formatRupiah(sumBersih)}`, 14, finalY);

  doc.save(`Rekap_Payroll_Finance_${period}.pdf`);
});

// ================= DYNAMIC FORMS & SUBMISSIONS =================
const lemburContainer = document.getElementById('lemburListContainer');
function addLemburRow() {
  const rowId = 'lembur_' + Date.now() + Math.floor(Math.random()*1000);
  const div = document.createElement('div');
  div.className = 'dynamic-row grid two-columns';
  div.id = rowId;
  div.innerHTML = `
    <button type="button" class="remove-row-btn" title="Hapus Baris" onclick="document.getElementById('${rowId}').remove()">✕</button>
    <label><span>Tanggal Lembur</span><input type="date" class="l_tanggal" required/></label>
    <label><span>Deskripsi Pekerjaan</span><input type="text" class="l_deskripsi" placeholder="Detail pekerjaan..." required/></label>
    <label><span>Jam Mulai</span><input type="time" class="l_jamMulai" required/></label>
    <label><span>Jam Selesai</span><input type="time" class="l_jamSelesai" required/></label>
    <label style="grid-column: 1 / -1;"><span>Catatan (Opsional)</span><input type="text" class="l_catatan" placeholder="Catatan tambahan..."/></label>
  `;
  lemburContainer.appendChild(div);
}
document.getElementById('addLemburRowBtn').addEventListener('click', addLemburRow);

const cutiContainer = document.getElementById('cutiListContainer');
function addCutiRow() {
  const rowId = 'cuti_' + Date.now() + Math.floor(Math.random()*1000);
  const div = document.createElement('div');
  div.className = 'dynamic-row grid two-columns';
  div.id = rowId;
  div.innerHTML = `
    <button type="button" class="remove-row-btn" title="Hapus Baris" onclick="document.getElementById('${rowId}').remove()">✕</button>
    <label><span>Jenis Pengajuan</span>
      <select class="c_jenis" required>
        <option value="Cuti Tahunan">Cuti Tahunan</option>
        <option value="Sakit">Sakit</option>
        <option value="Ijin">Ijin Lainnya</option>
      </select>
    </label>
    <label><span>Alasan / Keterangan</span><input type="text" class="c_alasan" placeholder="Cth: Keperluan keluarga" required/></label>
    <label><span>Tanggal Mulai</span><input type="date" class="c_tglMulai" required/></label>
    <label><span>Tanggal Selesai</span><input type="date" class="c_tglSelesai" required/></label>
  `;
  cutiContainer.appendChild(div);
}
document.getElementById('addCutiRowBtn').addEventListener('click', addCutiRow);

document.getElementById('lemburForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitLemburBtn');
  const rows = Array.from(lemburContainer.querySelectorAll('.dynamic-row'));
  if (rows.length === 0) return showToast('Tambahkan minimal 1 baris lembur!', 'error');

  setButtonLoading(btn, true, 'Menyimpan Lembur...');
  const nik = document.getElementById('l_nik').value;

  const lemburList = rows.map(row => {
    const mulai = row.querySelector('.l_jamMulai').value;
    const selesai = row.querySelector('.l_jamSelesai').value;
    const totalJam = calculateOvertime(mulai, selesai);

    return {
      nik, 
      nama: document.getElementById('l_nama').value, 
      divisi: document.getElementById('l_divisi').value,
      tanggal: row.querySelector('.l_tanggal').value,
      deskripsi: row.querySelector('.l_deskripsi').value,
      jamMulai: mulai, 
      jamSelesai: selesai, 
      totalJam: `${totalJam} jam`,
      catatan: row.querySelector('.l_catatan').value,
      updatedBy: state.currentUser.username
    };
  });

  const res = await apiRequest('saveLemburMultiple', { lemburList });
  setButtonLoading(btn, false);
  if (res) {
    showToast('Lembur berhasil disimpan!');
    lemburContainer.innerHTML = ''; 
    addLemburRow();
    loadLembur(); 
    switchTab('statusLemburTab');
  }
});

document.getElementById('cutiForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitCutiBtn');
  const rows = Array.from(cutiContainer.querySelectorAll('.dynamic-row'));
  if (rows.length === 0) return showToast('Tambahkan minimal 1 baris Ijin/Cuti!', 'error');

  setButtonLoading(btn, true, 'Mengajukan...');
  const nik = document.getElementById('c_nik').value;

  const perijinanList = rows.map(row => ({
    nik, 
    nama: document.getElementById('c_nama').value, 
    divisi: document.getElementById('c_divisi').value,
    jenis: row.querySelector('.c_jenis').value, 
    alasan: row.querySelector('.c_alasan').value,
    tanggalMulai: row.querySelector('.c_tglMulai').value, 
    tanggalSelesai: row.querySelector('.c_tglSelesai').value,
    updatedBy: state.currentUser.username
  }));

  const res = await apiRequest('savePerijinanMultiple', { perijinanList });
  setButtonLoading(btn, false);
  if (res) {
    showToast('Ijin/Cuti diajukan & notifikasi dikirim!');
    cutiContainer.innerHTML = ''; 
    addCutiRow();
    loadCuti(); 
    switchTab('statusCutiTab');
  }
});

// ================= RENDER TABLES (LEMBUR & CUTI) =================
function renderStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'disetujui' || s === 'selesai') return `<span class="status disetujui">${status}</span>`;
  if (s === 'ditolak') return `<span class="status ditolak">Ditolak</span>`;
  return `<span class="status diajukan">Diajukan</span>`;
}

function renderLemburTables() {
  const saya = state.lembur.filter(r => r.nik === state.currentUser.nik);
  
  // Calculate current month's overtime hours for user
  const currentMonth = new Date().toISOString().slice(0, 7);
  const myMonthLembur = saya.filter(r => String(r.tanggal || '').startsWith(currentMonth));
  let totalHours = 0;
  myMonthLembur.forEach(r => {
    const num = Number(r.durasiJam || String(r.totalJam || '').replace(/[^0-9.]/g, ''));
    totalHours += num || 0;
  });
  const monthLemburEl = document.getElementById('userMonthOvertimeHours');
  if (monthLemburEl) monthLemburEl.textContent = `${totalHours.toFixed(2)} Jam`;

  // Status Lembur Saya (User View: NO Edit/Delete)
  const userRows = saya.length ? saya.map(r => {
    let dur = Number(r.durasiJam || 0);
    if (!dur && r.jamMulai && r.jamSelesai) {
      const [h1, m1] = r.jamMulai.split(':').map(Number);
      const [h2, m2] = r.jamSelesai.split(':').map(Number);
      if (!isNaN(h1) && !isNaN(h2)) {
        let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
        if (mins < 0) mins += 24 * 60;
        dur = mins / 60;
      }
    }
    const durStr = dur > 0 ? `${dur % 1 === 0 ? dur.toFixed(0) : dur.toFixed(2)} Jam` : (r.totalJam || '-');

    return `
      <tr>
        <td><span class="mono-text">${formatDate(r.tanggal)}</span></td>
        <td><strong>${r.deskripsi || r.deskripsiPekerjaan || r.keterangan || r.pekerjaan || '-'}</strong></td>
        <td><span class="mono-text">${r.jamMulai || '-'}</span></td>
        <td><span class="mono-text">${r.jamSelesai || '-'}</span></td>
        <td><span class="mono-text" style="color: var(--accent-primary); font-weight: 600;">${durStr}</span></td>
        <td>${r.catatan || '-'}</td>
        <td>${renderStatusBadge(r.status)}</td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="7" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada data lembur yang tercatat.</td></tr>`;

  document.getElementById('statusLemburTableWrap').innerHTML = `
    <table>
      <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Jam Mulai</th><th>Jam Selesai</th><th>Total Jam</th><th>Catatan</th><th>Status</th></tr></thead>
      <tbody>${userRows}</tbody>
    </table>
  `;

  // Admin Rekap Lembur (Admin View: with Edit & Delete)
  if (state.currentUser.role === 'admin') {
    const adminRows = state.lembur.length ? state.lembur.map(r => {
      let dur = Number(r.durasiJam || 0);
      if (!dur && r.jamMulai && r.jamSelesai) {
        const [h1, m1] = r.jamMulai.split(':').map(Number);
        const [h2, m2] = r.jamSelesai.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
          if (mins < 0) mins += 24 * 60;
          dur = mins / 60;
        }
      }
      const durStr = dur > 0 ? `${dur % 1 === 0 ? dur.toFixed(0) : dur.toFixed(2)} Jam` : (r.totalJam || '-');

      return `
        <tr>
          <td><strong>${r.nama || '-'}</strong><br><small class="mono-text">${r.nik}</small></td>
          <td><span class="mono-text">${formatDate(r.tanggal)}</span></td>
          <td><strong>${r.deskripsi || r.deskripsiPekerjaan || r.keterangan || r.pekerjaan || '-'}</strong></td>
          <td><span class="mono-text">${r.jamMulai || '-'}</span></td>
          <td><span class="mono-text">${r.jamSelesai || '-'}</span></td>
          <td><span class="mono-text" style="color: var(--accent-primary); font-weight: 600;">${durStr}</span></td>
          <td>${r.catatan || '-'}</td>
          <td class="action-cell">
            <div class="action-cell-group">
              <button class="action-btn edit" onclick="openEditLembur('${r.id}')">Edit</button>
              <button class="action-btn delete" onclick="deleteLembur('${r.id}')">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada data lembur.</td></tr>`;

    document.getElementById('adminLemburTableWrap').innerHTML = `
      <table>
        <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Deskripsi</th><th>Jam Mulai</th><th>Jam Selesai</th><th>Total Jam</th><th>Catatan</th><th>Aksi</th></tr></thead>
        <tbody>${adminRows}</tbody>
      </table>
    `;
  }
}

function renderCutiTables() {
  const adminUser = state.users.find(u => u.role === 'admin' && (u.noHp || u.nohp));
  const adminPhone = adminUser ? formatWaNumber(adminUser.noHp || adminUser.nohp) : '';

  // Transparan: Seluruh karyawan dapat melihat jadwal cuti rekan warehouse
  const allLeaves = state.cuti;

  const userRows = allLeaves.length ? allLeaves.map(r => {
    const tglMulai = r.tglMulai || r.tanggalMulai || '';
    const tglSelesai = r.tglSelesai || r.tanggalSelesai || tglMulai;
    const userWaMsg = encodeURIComponent(`Halo Admin, saya telah mengajukan ${r.jenis || 'Cuti'} untuk periode ${tglMulai} s/d ${tglSelesai}. Alasan: ${r.alasan || '-'}. Mohon konfirmasi. Terima kasih.`);
    const waAdminBtn = (adminPhone && r.nik === state.currentUser.nik) ? `<a class="action-btn wa" href="https://wa.me/${adminPhone}?text=${userWaMsg}" target="_blank">📲 WA Admin</a>` : '';

    return `
      <tr>
        <td><strong>${r.nama || '-'}</strong></td>
        <td><span class="mono-text">${r.nik || '-'}</span></td>
        <td><strong>${r.jenis || 'Cuti'}</strong></td>
        <td><span class="mono-text">${formatDate(tglMulai)}</span></td>
        <td><span class="mono-text">${formatDate(tglSelesai)}</span></td>
        <td>${r.alasan || '-'}</td>
        <td>${renderStatusBadge(r.status)}</td>
        <td class="action-cell">
          <div class="action-cell-group">
            ${waAdminBtn || '-'}
          </div>
        </td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada jadwal cuti/ijin tim warehouse.</td></tr>`;

  document.getElementById('statusCutiTableWrap').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nama Karyawan</th>
          <th>ID</th>
          <th>Jenis</th>
          <th>Tanggal Mulai</th>
          <th>Tanggal Selesai</th>
          <th>Alasan</th>
          <th>Status</th>
          <th>Hubungi</th>
        </tr>
      </thead>
      <tbody>${userRows}</tbody>
    </table>
  `;

  // Admin Approval & Management View
  if (state.currentUser.role === 'admin') {
    const adminRows = allLeaves.length ? allLeaves.map(r => {
      const tglMulai = r.tglMulai || r.tanggalMulai || '';
      const tglSelesai = r.tglSelesai || r.tanggalSelesai || tglMulai;
      const empUser = state.users.find(u => String(u.nik) === String(r.nik));
      const empPhone = empUser ? formatWaNumber(empUser.noHp || empUser.nohp) : '';
      const adminWaMsg = encodeURIComponent(`Halo ${r.nama}, terkait pengajuan ${r.jenis || 'Cuti'} periode ${tglMulai} s/d ${tglSelesai}, status pengajuan saat ini: [${r.status || 'Diajukan'}]. Terima kasih.`);
      const waEmpBtn = empPhone ? `<a class="action-btn wa" href="https://wa.me/${empPhone}?text=${adminWaMsg}" target="_blank">📲 WA</a>` : '';

      return `
        <tr>
          <td><strong>${r.nama || '-'}</strong></td>
          <td><span class="mono-text">${r.nik || '-'}</span></td>
          <td><strong>${r.jenis || 'Cuti'}</strong></td>
          <td><span class="mono-text">${formatDate(tglMulai)}</span></td>
          <td><span class="mono-text">${formatDate(tglSelesai)}</span></td>
          <td>${r.alasan || '-'}</td>
          <td>${renderStatusBadge(r.status)}</td>
          <td class="action-cell">
            <div class="action-cell-group">
              <button class="action-btn edit" onclick="openEditCuti('${r.id}')">Edit & Status</button>
              ${waEmpBtn}
              <button class="action-btn delete" onclick="deleteCuti('${r.id}')">Hapus</button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="8" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada pengajuan cuti.</td></tr>`;

    document.getElementById('adminCutiTableWrap').innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Nama Karyawan</th>
            <th>ID</th>
            <th>Jenis</th>
            <th>Tanggal Mulai</th>
            <th>Tanggal Selesai</th>
            <th>Alasan</th>
            <th>Status</th>
            <th>Aksi / Notif</th>
          </tr>
        </thead>
        <tbody>${adminRows}</tbody>
      </table>
    `;
  }
}

// ================= USER MANAGEMENT =================
function renderUserTable() {
  const wrap = document.getElementById('userListWrap');
  if (!wrap) return;

  if (!state.users.length) {
    wrap.innerHTML = '<p style="padding: 20px; color: var(--text-muted); text-align: center;">Belum ada user terdaftar.</p>';
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>NIK</th>
          <th>Nama</th>
          <th>Divisi</th>
          <th>Username</th>
          <th>Password</th>
          <th>Gaji Pokok</th>
          <th>Rate Lembur</th>
          <th>Kontak</th>
          <th>Role</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${state.users.map(u => `
          <tr>
            <td><strong>${u.nik}</strong></td>
            <td>${u.nama}</td>
            <td>${u.divisi}</td>
            <td><span class="mono-text">${u.username}</span></td>
            <td><span class="mono-text" style="color: var(--accent-primary); font-weight: 600;">${u.password || '-'}</span></td>
            <td><span class="mono-text">${formatRupiah(u.gajiPokok)}</span></td>
            <td><span class="mono-text">${formatRupiah(u.rateLembur || 25000)}/jam</span></td>
            <td>
              <small>${u.email || '-'}</small><br>
              <small class="mono-text">${u.noHp || '-'}</small>
            </td>
            <td><span class="status ${u.role === 'admin' ? 'disetujui' : 'diajukan'}">${u.role}</span></td>
            <td class="action-cell">
              <button class="action-btn edit" onclick="editUser('${u.nik}')">Edit</button>
              <button class="action-btn delete" onclick="deleteUserRecord('${u.nik}')">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.editUser = (nik) => {
  const u = state.users.find(x => x.nik === nik);
  if (!u) return;
  document.getElementById('userEditMode').value = "true";
  document.getElementById('userNIK').value = u.nik;
  document.getElementById('userName').value = u.nama;
  document.getElementById('userDivisi').value = u.divisi;
  document.getElementById('userUsername').value = u.username;
  document.getElementById('userPassword').value = u.password;
  document.getElementById('userGajiPokok').value = u.gajiPokok || 0;
  document.getElementById('userTunjangan').value = u.tunjangan || 0;
  document.getElementById('userRateLembur').value = u.rateLembur || 25000;
  document.getElementById('userSaldoKasbon').value = u.saldoKasbon || 0;
  document.getElementById('userEmail').value = u.email || '';
  document.getElementById('userNoHp').value = u.noHp || u.nohp || '';
  document.getElementById('userRole').value = u.role || 'user';
  
  const formTitle = document.getElementById('userFormTitle');
  if (formTitle) formTitle.textContent = `Edit Karyawan - ${u.nama} (${u.nik})`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteUserRecord = async (nik) => {
  if (nik === state.currentUser.nik) return showToast('Tidak dapat menghapus akun sendiri!', 'error');
  if (confirm(`Hapus user dengan NIK ${nik}?`)) {
    const res = await apiRequest('deleteUser', { nik });
    if (res) {
      showToast('User berhasil dihapus');
      loadUsersData();
    }
  }
};

document.getElementById('userForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveUser');
  setButtonLoading(btn, true, 'Menyimpan...');

  const payload = {
    nik: document.getElementById('userNIK').value.trim(),
    nama: document.getElementById('userName').value.trim(),
    divisi: document.getElementById('userDivisi').value.trim(),
    username: document.getElementById('userUsername').value.trim(),
    password: document.getElementById('userPassword').value.trim(),
    gajiPokok: document.getElementById('userGajiPokok').value,
    tunjangan: document.getElementById('userTunjangan').value,
    rateLembur: document.getElementById('userRateLembur').value,
    saldoKasbon: document.getElementById('userSaldoKasbon').value,
    email: document.getElementById('userEmail').value.trim(),
    noHp: document.getElementById('userNoHp').value.trim(),
    role: document.getElementById('userRole').value
  };

  const res = await apiRequest('saveUser', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Data karyawan berhasil disimpan!');
    document.getElementById('userForm').reset();
    document.getElementById('userEditMode').value = "false";
    const formTitle = document.getElementById('userFormTitle');
    if (formTitle) formTitle.textContent = 'Tambah / Edit Data Karyawan & Gaji';
    loadUsersData();
  }
});

document.getElementById('resetUserFormBtn').addEventListener('click', () => {
  document.getElementById('userForm').reset();
  document.getElementById('userEditMode').value = "false";
  const formTitle = document.getElementById('userFormTitle');
  if (formTitle) formTitle.textContent = 'Tambah / Edit Data Karyawan & Gaji';
});

// ================= MODAL & ACTIONS =================
window.closeModal = (modalId) => {
  document.getElementById(modalId).classList.add('hidden');
};

window.openEditLembur = (id) => {
  const item = state.lembur.find(r => r.id === id);
  if (!item) return;
  document.getElementById('editL_id').value = item.id;
  document.getElementById('editL_tanggal').value = item.tanggal || '';
  document.getElementById('editL_deskripsi').value = item.deskripsi || item.deskripsiPekerjaan || item.keterangan || item.pekerjaan || '';
  document.getElementById('editL_jamMulai').value = item.jamMulai || '';
  document.getElementById('editL_jamSelesai').value = item.jamSelesai || '';
  document.getElementById('editL_catatan').value = item.catatan || '';
  document.getElementById('editLemburModal').classList.remove('hidden');
};

document.getElementById('editLemburForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveEditLembur');
  setButtonLoading(btn, true, 'Menyimpan...');

  const id = document.getElementById('editL_id').value;
  const mulai = document.getElementById('editL_jamMulai').value;
  const selesai = document.getElementById('editL_jamSelesai').value;
  const totalJam = calculateOvertime(mulai, selesai);

  const payload = {
    id,
    tanggal: document.getElementById('editL_tanggal').value,
    deskripsi: document.getElementById('editL_deskripsi').value,
    jamMulai: mulai,
    jamSelesai: selesai,
    totalJam: `${totalJam} jam`,
    catatan: document.getElementById('editL_catatan').value,
    updatedBy: state.currentUser.username
  };

  const res = await apiRequest('updateLembur', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Data lembur berhasil diperbarui!');
    closeModal('editLemburModal');
    loadLembur();
  }
});

window.openEditCuti = (id) => {
  const item = state.cuti.find(r => r.id === id);
  if (!item) return;
  document.getElementById('editC_id').value = item.id;
  document.getElementById('editC_nik').value = item.nik || '';
  document.getElementById('editC_jenis').value = item.jenis || 'Cuti Tahunan';
  document.getElementById('editC_tglMulai').value = item.tanggalMulai || '';
  document.getElementById('editC_tglSelesai').value = item.tanggalSelesai || '';
  document.getElementById('editC_alasan').value = item.alasan || '';
  document.getElementById('editC_status').value = item.status || 'Diajukan';
  document.getElementById('editCutiModal').classList.remove('hidden');
};

document.getElementById('editCutiForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btnSaveEditCuti');
  setButtonLoading(btn, true, 'Menyimpan...');

  const payload = {
    id: document.getElementById('editC_id').value,
    nik: document.getElementById('editC_nik').value,
    jenis: document.getElementById('editC_jenis').value,
    tanggalMulai: document.getElementById('editC_tglMulai').value,
    tanggalSelesai: document.getElementById('editC_tglSelesai').value,
    alasan: document.getElementById('editC_alasan').value,
    status: document.getElementById('editC_status').value,
    updatedBy: state.currentUser.username
  };

  const res = await apiRequest('updatePerijinan', payload);
  setButtonLoading(btn, false);
  if (res) {
    showToast('Data perijinan diperbarui & notifikasi dikirim!');
    closeModal('editCutiModal');
    loadCuti();
  }
});

window.deleteLembur = async (id) => {
  if (confirm('Hapus lembur ini?')) {
    await apiRequest('deleteLembur', { id }); 
    loadLembur();
  }
};

window.deleteCuti = async (id) => {
  if (confirm('Hapus perijinan ini?')) {
    await apiRequest('deletePerijinan', { id }); 
    loadCuti();
  }
};

// ================= PDF EXPORT LEMBUR =================
function exportPdf(isAdmin) {
  if (!window.jspdf || !window.jspdf.jsPDF) return showToast('Library PDF belum siap', 'error');

  const rows = isAdmin ? state.lembur : state.lembur.filter(r => r.nik === state.currentUser.nik);
  const doc = new window.jspdf.jsPDF();
  const filename = isAdmin ? 'rekap-lembur-admin.pdf' : 'rekap-lembur-saya.pdf';

  doc.setFontSize(16);
  doc.text(isAdmin ? 'Rekap Semua Lembur Warehouse (Admin)' : 'Rekap Lembur Saya', 14, 20);

  if (!rows.length) {
    doc.setFontSize(11);
    doc.text('Belum ada data lembur.', 14, 32);
    doc.save(filename);
    return;
  }

  const body = rows.map(r => [
    isAdmin ? `${r.nik} - ${r.nama}` : '',
    formatDate(r.tanggal),
    r.deskripsi || r.deskripsiPekerjaan || r.keterangan || r.pekerjaan || '-',
    r.jamMulai || '-',
    r.jamSelesai || '-',
    r.totalJam || '-',
    r.catatan || '-'
  ].filter((_, idx) => isAdmin || idx > 0));

  const head = isAdmin 
    ? [['User', 'Tanggal', 'Deskripsi', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Catatan']]
    : [['Tanggal', 'Deskripsi', 'Jam Mulai', 'Jam Selesai', 'Total Jam', 'Catatan']];

  doc.autoTable({
    head,
    body,
    startY: 28,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [56, 189, 248], textColor: [13, 17, 23] }
  });

  doc.save(filename);
}

document.getElementById('downloadStatusPdfBtn').addEventListener('click', () => exportPdf(false));
document.getElementById('downloadAdminPdfBtn').addEventListener('click', () => exportPdf(true));

// ================= DATA LOADERS =================
async function loadLembur() {
  const res = await apiRequest('getLembur', { 
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik, 
    role: state.currentUser.role 
  });
  if (res) { 
    state.lembur = res.data || []; 
    renderLemburTables(); 
  }
}

async function loadCuti() {
  const res = await apiRequest('getPerijinan');
  if (res) { 
    state.cuti = res.data || []; 
    renderCutiTables(); 
  }
}

async function loadUsersData() {
  const usrRes = await apiRequest('getUsers');
  if (usrRes) {
    state.users = usrRes.users || [];
    renderUserTable();
    syncUserFields('l_nik', 'l_nama', 'l_divisi');
    syncUserFields('c_nik', 'c_nama', 'c_divisi');
  }
}

function syncUserFields(selectId, namaId, divId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  if (state.currentUser.role !== 'admin') {
    select.innerHTML = `<option value="${state.currentUser.nik}">${state.currentUser.nik} - ${state.currentUser.nama}</option>`;
    select.disabled = true;
    if (namaId) document.getElementById(namaId).value = state.currentUser.nama;
    if (divId) document.getElementById(divId).value = state.currentUser.divisi;
  } else {
    select.disabled = false;
    select.innerHTML = state.users.map(u => `<option value="${u.nik}">${u.nik} - ${u.nama}</option>`).join('');
    select.onchange = () => {
      const u = state.users.find(x => x.nik === select.value);
      if (u) { 
        if (namaId) document.getElementById(namaId).value = u.nama; 
        if (divId) document.getElementById(divId).value = u.divisi; 
      }
    };
    if (state.users.length && !select.value) select.dispatchEvent(new Event('change'));
  }
}

async function startApp() {
  try {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('appPage').classList.remove('hidden');
    
    // Set default current month in payroll picker
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const picker = document.getElementById('payrollMonthPicker');
    if (picker && !picker.value) picker.value = currentMonthStr;

    // User Labels
    if (state.currentUser) {
      const userLabel = document.getElementById('loggedUserLabel');
      if (userLabel) userLabel.textContent = `${state.currentUser.nama || ''} (${state.currentUser.role || ''})`;
      
      const sidebarName = document.getElementById('sidebarUserName');
      const sidebarRole = document.getElementById('sidebarUserRole');
      if (sidebarName) sidebarName.textContent = state.currentUser.nama || 'Pengguna';
      if (sidebarRole) sidebarRole.textContent = `${state.currentUser.divisi || 'Warehouse'} • ${state.currentUser.role || 'user'}`;
      
      // Role-Based Navigation Groups (Admin Only Modules)
      const adminGroup = document.getElementById('adminNavGroup');
      const invGroup = document.getElementById('inventoryNavGroup');
      const taskGroup = document.getElementById('taskNavGroup');
      const isAdmin = state.currentUser.role === 'admin';

      if (adminGroup) adminGroup.classList.toggle('hidden', !isAdmin);
      if (invGroup) invGroup.classList.toggle('hidden', !isAdmin);
      if (taskGroup) taskGroup.classList.toggle('hidden', !isAdmin);
    }

    startLiveClock();
    switchTab('presensiTab');

    // Load data in parallel for maximum speed
    await Promise.allSettled([
      loadUsersData(),
      loadShifts(),
      loadRosterShifts(),
      loadAbsensi(),
      loadKasbon(),
      loadLembur(),
      loadCuti(),
      loadPayroll()
    ]);
  } catch (err) {
    console.error('Error starting app:', err);
  }
}

// ================= AUTH EVENTS =================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginSubmitBtn');
  const msg = document.getElementById('loginMessage');
  if (msg) {
    msg.textContent = '';
  }
  setButtonLoading(btn, true, 'Memverifikasi...');

  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');

  const res = await apiRequest('login', { 
    username: usernameInput ? usernameInput.value.trim() : '', 
    password: passwordInput ? passwordInput.value.trim() : '' 
  });
  
  setButtonLoading(btn, false);
  if (res && res.success && res.user) {
    state.currentUser = res.user;
    localStorage.setItem('currentUser', JSON.stringify(res.user));
    await startApp();
  } else {
    if (msg) {
      msg.textContent = (res && res.message) ? res.message : 'Username/NIK atau password salah!';
      msg.style.color = 'var(--error)';
    }
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('currentUser'); 
  location.reload();
});

navItems.forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

initTheme();

const savedUser = localStorage.getItem('currentUser');
if (savedUser) { 
  try {
    state.currentUser = JSON.parse(savedUser); 
    startApp(); 
  } catch (e) {
    localStorage.removeItem('currentUser');
  }
}