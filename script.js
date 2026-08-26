

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
  presensiTab: 'Presensi Harian Warehouse',
  formLemburTab: 'Form Pengajuan Lembur',
  statusLemburTab: 'Status Lembur Saya',
  formCutiTab: 'Form Pengajuan Ijin / Cuti',
  statusCutiTab: 'Info Ijin & Cuti Tim',
  profileTab: 'Profil & Penilaian KPI Karyawan',
  slipGajiTab: 'Slip Gaji Bulanan Saya',
  adminPayrollTab: 'Payroll Bulanan & Finance',
  adminKasbonTab: 'Manajemen Kasbon Karyawan',
  adminShiftAbsensiTab: 'Master Shift & Jadwal Roster',
  adminLemburTab: 'Admin Rekap Semua Lembur',
  adminCutiTab: 'Approval Ijin & Cuti Karyawan',
  settingTab: 'Kelola Data Karyawan & Gaji'
};

// ================= STRING & HTML HELPERS =================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

// ================= MODAL & UI HELPERS =================
window.openModal = (modalId) => {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.remove('hidden');
    m.classList.add('active');
  }
};

window.closeModal = (modalId) => {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.add('hidden');
    m.classList.remove('active');
  }
};

// ================= WAREHOUSE & TASK INTERACTIVE HELPERS =================
window.switchWarehouseView = (whId) => {
  const btns = document.querySelectorAll('.wh-tab-btn');
  btns.forEach((b, idx) => b.classList.toggle('active', idx + 1 === whId));
  showToast(`Beralih ke Warehouse ${whId}`);
};

window.openRackDetails = (rackId) => {
  showToast(`📍 Rak ${rackId}: Kapasitas 12 Slot • Status Aktif`, 'info');
};

window.toggleTaskCheck = (el) => {
  el.classList.toggle('checked');
  const isDone = el.classList.contains('checked');
  showToast(isDone ? '✅ Tugas berhasil diselesaikan!' : 'Tugas dikembalikan ke antrian.');
};



// ================= UI HELPERS & LOADING STATE =================
function showToast(msg, type = 'success') {
  if (!toast) return;
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
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  const panel = document.getElementById(tabId);
  if (panel) panel.classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
  if (navItem) navItem.classList.add('active');
  if (topbarPageTitle && tabTitles[tabId]) {
    topbarPageTitle.textContent = tabTitles[tabId];
  }

  if (tabId === 'profileTab') {
    renderUserProfileTab();
  }
  if (tabId === 'presensiTab') {
    updateAttendanceGatekeeper();
  }
  if (tabId === 'settingTab' && state.currentUser && state.currentUser.role === 'admin') {
    renderAdminProfileRequestsTable();
  }

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && overlay && window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  }
}
window.switchTab = switchTab;

// ================= SIDEBAR CONTROLS =================
function toggleSidebar() {
  const appLayout = document.getElementById('appPage');
  const sidebar = document.getElementById('sidebar');
  
  if (window.innerWidth <= 900) {
    const isOpen = sidebar ? sidebar.classList.contains('open') : false;
    if (isOpen) closeMobileSidebar();
    else openMobileSidebar();
  } else {
    if (appLayout) appLayout.classList.toggle('sidebar-collapsed');
  }
}

function openMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.remove('hidden');
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.add('hidden');
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
  const text = await res.text();
  if (!text) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

// ================= API REQUEST HANDLER =================
async function apiRequest(action, payload = {}) {
  // 1. UTAMAKAN SUPABASE UNTUK KECEPATAN INSTAN (<50ms)
  try {
    const result = await supabaseApiRequest(action, payload);
    if (result && result.success !== false) {
      // Trigger background sync ke Google Sheet sebagai data backup (fire-and-forget)
      triggerBackgroundSheetBackup(action, payload);
    }
    return result;
  } catch (err) {
    console.warn(`[Supabase API Error on ${action}]`, err);
    // Jika error dari Supabase (validasi data, dsb), langsung throw agar tidak ditutupi error GAS
    if (err.message && err.message.includes('Supabase API error')) {
      showToast(err.message, 'error');
      return null;
    }
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
    const resultText = await res.text();
    try {
      const result = JSON.parse(resultText);
      if (!result.success) throw new Error(result.message);
      return result;
    } catch (e) {
      throw new Error("Gagal memproses respon server. Pastikan URL Google Apps Script benar.");
    }
  } catch (error) {
    showToast(error.message || 'Gagal terhubung ke server', 'error');
    return null;
  }
}

// Background fire-and-forget sync to Google Sheets for live backup
function triggerBackgroundSheetBackup(action, payload) {
  const mutatingActions = [
    'saveUser', 'saveUserProfile', 'checkInAbsensi', 'checkOutAbsensi', 
    'saveAbsensiManual', 'updateAbsensi', 'deleteAbsensi', 'saveLemburMultiple', 
    'updateLembur', 'deleteLembur', 'savePerijinanMultiple', 'approvePerijinan', 
    'rejectPerijinan', 'deletePerijinan', 'saveRosterBulk', 'deleteRosterShift', 
    'saveShift', 'deleteShift', 'saveKasbon', 'deleteKasbon', 
    'generateMonthlyPayroll', 'savePayrollAdjustment'
  ];
  if (!mutatingActions.includes(action)) return;

  try {
    const postData = JSON.stringify({ action, ...payload });
    const body = new URLSearchParams({ data: postData }).toString();
    fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    }).catch(e => console.warn('[Background Sheet Backup Notice]', e));
  } catch (e) {
    // Ignore background backup errors
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
          noHp: user.no_hp || '',
          alamat: user.alamat || '',
          tglLahir: user.tgl_lahir || '',
          tglBergabung: user.tgl_bergabung || '',
          foto: user.foto || '',
          hobi: user.hobi || '',
          kontakDarurat: user.kontak_darurat || ''
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
          noHp: u.no_hp || '',
          alamat: u.alamat || '',
          tglLahir: u.tgl_lahir || '',
          tglBergabung: u.tgl_bergabung || '',
          foto: u.foto || '',
          hobi: u.hobi || '',
          kontakDarurat: u.kontak_darurat || ''
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
        alamat: u.alamat || '',
        tgl_lahir: u.tglLahir || '',
        tgl_bergabung: u.tglBergabung || u.tgl_bergabung || '',
        foto: u.foto || '',
        hobi: u.hobi || '',
        kontak_darurat: u.kontakDarurat || '',
        updated_at: new Date().toISOString()
      };
      await supabaseFetch('karyawan?on_conflict=nik', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: [row]
      });
      return { success: true, message: 'Data karyawan berhasil disimpan' };
    }

    case 'saveUserProfile': {
      const p = payload;
      const patchData = {};
      if (p.nama !== undefined) patchData.nama = p.nama;
      if (p.email !== undefined) patchData.email = p.email;
      if (p.noHp !== undefined) patchData.no_hp = p.noHp;
      if (p.alamat !== undefined) patchData.alamat = p.alamat;
      if (p.tglLahir !== undefined) patchData.tgl_lahir = p.tglLahir || null;
      if (p.tglBergabung !== undefined) patchData.tgl_bergabung = p.tglBergabung || null;
      if (p.foto !== undefined) patchData.foto = p.foto;
      if (p.hobi !== undefined) patchData.hobi = p.hobi;
      if (p.kontakDarurat !== undefined) patchData.kontak_darurat = p.kontakDarurat;
      patchData.updated_at = new Date().toISOString();

      await supabaseFetch(`karyawan?nik=eq.${encodeURIComponent(p.nik)}`, {
        method: 'PATCH',
        body: patchData
      });
      return { success: true, message: 'Data diri berhasil diperbarui' };
    }

    case 'deleteUser': {
      await supabaseFetch(`karyawan?nik=eq.${encodeURIComponent(payload.nik)}`, { method: 'DELETE' });
      return { success: true, message: 'Karyawan berhasil dihapus' };
    }
    case 'getProfileRequests': {
      try {
        const data = await supabaseFetch('pengajuan_profil?order=created_at.desc');
        if (data && Array.isArray(data)) {
          return {
            success: true,
            data: data.map(r => ({
              id: r.id,
              nik: r.nik,
              namaLama: r.nama_lama,
              namaBaru: r.nama_baru,
              noHpBaru: r.no_hp_baru,
              emailBaru: r.email_baru,
              tglLahirBaru: r.tgl_lahir_baru,
              alamatBaru: r.alamat_baru,
              hobiBaru: r.hobi_baru,
              kontakDaruratBaru: r.kontak_darurat_baru,
              alasan: r.alasan,
              status: r.status,
              tanggal: r.tanggal,
              createdAt: r.created_at
            }))
          };
        }
      } catch (e) {}
      const localReqs = JSON.parse(localStorage.getItem('wms_profile_requests') || '[]');
      return { success: true, data: localReqs };
    }

    case 'submitProfileChangeRequest': {
      const row = {
        id: payload.id || ('REQ-' + Date.now()),
        nik: payload.nik,
        nama_lama: payload.namaLama,
        nama_baru: payload.namaBaru,
        no_hp_baru: payload.noHpBaru,
        email_baru: payload.emailBaru,
        tgl_lahir_baru: payload.tglLahirBaru || null,
        alamat_baru: payload.alamatBaru,
        hobi_baru: payload.hobiBaru,
        kontak_darurat_baru: payload.kontakDaruratBaru,
        alasan: payload.alasan,
        status: 'Diajukan',
        tanggal: payload.tanggal || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      };
      try {
        await supabaseFetch('pengajuan_profil', {
          method: 'POST',
          body: [row]
        });
      } catch (e) {}
      const localReqs = JSON.parse(localStorage.getItem('wms_profile_requests') || '[]');
      localReqs.unshift(payload);
      localStorage.setItem('wms_profile_requests', JSON.stringify(localReqs));
      return { success: true, data: payload };
    }

    case 'approveProfileChangeRequest': {
      const req = payload.approvedData;
      try {
        await supabaseFetch(`pengajuan_profil?id=eq.${encodeURIComponent(payload.id)}`, {
          method: 'PATCH',
          body: { status: 'Disetujui', updated_at: new Date().toISOString() }
        });
      } catch(e) {}

      if (req && req.nik) {
        const userUpdate = {
          nama: req.namaBaru,
          no_hp: req.noHpBaru,
          email: req.emailBaru,
          tgl_lahir: req.tglLahirBaru || null,
          alamat: req.alamatBaru,
          hobi: req.hobiBaru,
          kontak_darurat: req.kontakDaruratBaru,
          updated_at: new Date().toISOString()
        };
        await supabaseFetch(`karyawan?nik=eq.${encodeURIComponent(req.nik)}`, {
          method: 'PATCH',
          body: userUpdate
        });
      }

      const localReqs = JSON.parse(localStorage.getItem('wms_profile_requests') || '[]');
      const target = localReqs.find(x => x.id === payload.id);
      if (target) target.status = 'Disetujui';
      localStorage.setItem('wms_profile_requests', JSON.stringify(localReqs));

      return { success: true };
    }

    case 'rejectProfileChangeRequest': {
      try {
        await supabaseFetch(`pengajuan_profil?id=eq.${encodeURIComponent(payload.id)}`, {
          method: 'PATCH',
          body: { status: 'Ditolak', alasan_tolak: payload.alasanTolak || '', updated_at: new Date().toISOString() }
        });
      } catch(e) {}
      const localReqs = JSON.parse(localStorage.getItem('wms_profile_requests') || '[]');
      const target = localReqs.find(x => x.id === payload.id);
      if (target) {
        target.status = 'Ditolak';
        target.alasanTolak = payload.alasanTolak;
      }
      localStorage.setItem('wms_profile_requests', JSON.stringify(localReqs));
      return { success: true };
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
        data: (data || []).map(a => {
          let lateMins = Number(a.keterlambatan_menit || 0);
          if (!lateMins && a.status === 'Terlambat' && a.jam_masuk) {
            const [h, m] = a.jam_masuk.split(':').map(Number);
            const shiftStart = 8 * 60;
            const checkInMins = h * 60 + m;
            if (checkInMins > shiftStart + 15) {
              lateMins = checkInMins - shiftStart;
            }
          }

          return {
            id: a.id,
            nik: a.nik,
            nama: a.karyawan ? a.karyawan.nama : a.nik,
            divisi: a.karyawan ? a.karyawan.divisi : '',
            tanggal: a.tanggal,
            shift: a.shift || 'Shift 1',
            status: a.status || 'Hadir',
            jamMasuk: (a.jam_masuk || '').slice(0, 5),
            jamPulang: (a.jam_pulang || '').slice(0, 5),
            keterlambatanMenit: lateMins,
            catatan: a.catatan || ''
          };
        })
      };
    }

    case 'checkIn':
    case 'checkInAbsensi': {
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const today = now.toISOString().split('T')[0];
      
      let lateMins = 0;
      let status = 'Hadir';
      const shiftMasuk = payload.shiftJamMasuk || '08:00';
      const tolerance = Number(payload.toleransi || 15);
      
      const [shH, shM] = shiftMasuk.split(':').map(Number);
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const diffMins = (currentH * 60 + currentM) - (shH * 60 + (shM || 0));
      
      if (diffMins > tolerance) {
        status = 'Terlambat';
        lateMins = diffMins;
      }

      const row = {
        nik: payload.nik,
        tanggal: today,
        shift: payload.shift || 'Shift 1',
        status: status,
        jam_masuk: time
      };

      await supabaseFetch('presensi?on_conflict=nik,tanggal', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: [row]
      });

      fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkInAbsensi', data: payload })
      }).catch(() => {});

      return { success: true, message: `Presensi Masuk berhasil dicatat pukul ${time.slice(0, 5)} (${status})` };
    }

    case 'checkOut':
    case 'checkOutAbsensi': {
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const today = now.toISOString().split('T')[0];
      await supabaseFetch(`presensi?nik=eq.${encodeURIComponent(payload.nik)}&tanggal=eq.${today}`, {
        method: 'PATCH',
        body: { jam_pulang: time }
      });

      fetch(GOOGLE_SHEET_WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkOutAbsensi', data: payload })
      }).catch(() => {});

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

    case 'updateAbsensi':
    case 'editAbsensi': {
      const a = payload.absensi || payload;
      const jamM = a.jamMasuk ? (a.jamMasuk.length === 5 ? a.jamMasuk + ':00' : a.jamMasuk) : null;
      const jamP = a.jamPulang ? (a.jamPulang.length === 5 ? a.jamPulang + ':00' : a.jamPulang) : null;

      const patchData = {
        shift: a.shift || 'Shift 1',
        status: a.status || 'Hadir',
        jam_masuk: jamM,
        jam_pulang: jamP,
        catatan: a.catatan || ''
      };
      if (a.tanggal) patchData.tanggal = a.tanggal;

      if (a.id && !isNaN(Number(a.id))) {
        await supabaseFetch(`presensi?id=eq.${encodeURIComponent(a.id)}`, {
          method: 'PATCH',
          body: patchData
        });
      } else if (a.nik && a.tanggal) {
        await supabaseFetch(`presensi?nik=eq.${encodeURIComponent(a.nik)}&tanggal=eq.${encodeURIComponent(a.tanggal)}`, {
          method: 'PATCH',
          body: patchData
        });
      } else if (a.id) {
        await supabaseFetch(`presensi?id=eq.${encodeURIComponent(a.id)}`, {
          method: 'PATCH',
          body: patchData
        });
      } else {
        throw new Error('ID atau NIK dan Tanggal presensi diperlukan untuk update.');
      }
      return { success: true, message: 'Data presensi berhasil diperbarui' };
    }

    case 'deleteAbsensi': {
      if (payload.id && !isNaN(Number(payload.id))) {
        await supabaseFetch(`presensi?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      } else if (payload.nik && payload.tanggal) {
        await supabaseFetch(`presensi?nik=eq.${encodeURIComponent(payload.nik)}&tanggal=eq.${encodeURIComponent(payload.tanggal)}`, { method: 'DELETE' });
      } else if (payload.id) {
        await supabaseFetch(`presensi?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      }
      return { success: true, message: 'Log presensi berhasil dihapus' };
    }

    case 'getLembur': {
      const filter = payload.nik ? `&nik=eq.${encodeURIComponent(payload.nik)}` : '';
      const data = await supabaseFetch(`lembur?order=tanggal.desc${filter}`);
      return {
        success: true,
        data: (data || []).map(l => {
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
            deskripsi: l.deskripsi || l.deskripsiPekerjaan || l.keterangan || '-',
            jamMulai: jamM,
            jamSelesai: jamS,
            durasiJam: dur,
            totalJam: dur > 0 ? `${dur % 1 === 0 ? dur.toFixed(0) : dur.toFixed(2)} Jam` : '-',
            rateLembur: Number(l.rate_lembur || 0),
            totalLembur: Number(l.total_lembur || 0),
            status: l.status || 'Diajukan',
            approvedBy: l.approved_by || '',
            catatan: l.catatan || ''
          };
        })
      };
    }

    case 'saveLembur':
    case 'saveLemburMultiple': {
      const rawList = payload.lemburList || payload.list || (payload.lembur ? [payload.lembur] : [payload]);
      const list = rawList.map(l => {
        const jamM = l.jamMulai || l.jam_mulai || '';
        const jamS = l.jamSelesai || l.jam_selesai || '';
        let dur = Number(l.durasiJam || l.durasi_jam || 0);
        if ((!dur || dur === 0) && jamM && jamS) {
          const [h1, m1] = jamM.split(':').map(Number);
          const [h2, m2] = jamS.split(':').map(Number);
          if (!isNaN(h1) && !isNaN(h2)) {
            let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
            if (mins < 0) mins += 24 * 60;
            dur = mins / 60;
          }
        }
        const emp = (state.users || []).find(u => String(u.nik) === String(l.nik)) || (state.currentUser && String(state.currentUser.nik) === String(l.nik) ? state.currentUser : null);
        const rate = Number(l.rateLembur || l.rate_lembur || (emp ? emp.rateLembur || emp.rate_lembur : 0) || 25000);
        const totalUang = Number(l.totalLembur || l.total_lembur || Math.round(dur * rate));

        return {
          id: l.id || 'LMB-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          nik: l.nik,
          nama: l.nama || (emp ? emp.nama : l.nik),
          divisi: l.divisi || (emp ? emp.divisi : ''),
          tanggal: l.tanggal || new Date().toISOString().slice(0, 10),
          deskripsi: l.deskripsi || l.keterangan || l.deskripsiPekerjaan || '-',
          jam_mulai: jamM.length === 5 ? jamM + ':00' : (jamM || '00:00:00'),
          jam_selesai: jamS.length === 5 ? jamS + ':00' : (jamS || '00:00:00'),
          durasi_jam: Number(dur.toFixed(2)),
          rate_lembur: rate,
          total_lembur: totalUang,
          status: l.status || 'Diajukan',
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

    case 'updateLembur':
    case 'editLembur': {
      const l = payload.lembur || payload;
      const jamM = l.jamMulai || l.jam_mulai || '';
      const jamS = l.jamSelesai || l.jam_selesai || '';
      let dur = Number(l.durasiJam || l.durasi_jam || 0);
      if ((!dur || dur === 0) && jamM && jamS) {
        const [h1, m1] = jamM.split(':').map(Number);
        const [h2, m2] = jamS.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(h2)) {
          let mins = (h2 * 60 + (m2 || 0)) - (h1 * 60 + (m1 || 0));
          if (mins < 0) mins += 24 * 60;
          dur = mins / 60;
        }
      }
      const emp = (state.users || []).find(u => String(u.nik) === String(l.nik));
      const rate = Number(l.rateLembur || l.rate_lembur || (emp ? emp.rateLembur : 0) || 25000);
      const patchData = {
        tanggal: l.tanggal,
        deskripsi: l.deskripsi || l.keterangan || l.deskripsiPekerjaan || '-',
        jam_mulai: jamM.length === 5 ? jamM + ':00' : jamM,
        jam_selesai: jamS.length === 5 ? jamS + ':00' : jamS,
        durasi_jam: Number(dur.toFixed(2)),
        rate_lembur: rate,
        total_lembur: Number(l.totalLembur || l.total_lembur || Math.round(dur * rate)),
        catatan: l.catatan || ''
      };
      if (l.status) patchData.status = l.status;
      if (l.approvedBy || l.approved_by) {
        patchData.approved_by = l.approvedBy || l.approved_by;
        patchData.approved_at = new Date().toISOString();
      }
      await supabaseFetch(`lembur?id=eq.${encodeURIComponent(l.id)}`, {
        method: 'PATCH',
        body: patchData
      });
      return { success: true, message: 'Data lembur berhasil diperbarui' };
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

    case 'deleteLembur': {
      await supabaseFetch(`lembur?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      return { success: true, message: 'Data lembur berhasil dihapus' };
    }

    case 'getPerijinan':
    case 'getCuti': {
      const filter = payload.nik ? `&nik=eq.${encodeURIComponent(payload.nik)}` : '';
      const data = await supabaseFetch(`perijinan_cuti?order=tgl_mulai.desc${filter}`);
      return {
        success: true,
        data: (data || []).map(c => ({
          id: c.id,
          nik: c.nik,
          nama: c.nama,
          divisi: c.divisi,
          jenis: c.jenis || 'Cuti Tahunan',
          tglMulai: c.tgl_mulai,
          tglSelesai: c.tgl_selesai || c.tgl_mulai,
          tanggalMulai: c.tgl_mulai,
          tanggalSelesai: c.tgl_selesai || c.tgl_mulai,
          jumlahHari: Number(c.jumlah_hari || 1),
          alasan: c.alasan,
          status: c.status || 'Diajukan',
          approvedBy: c.approved_by || '',
          catatan: c.catatan || ''
        }))
      };
    }

    case 'savePerijinan':
    case 'savePerijinanMultiple':
    case 'saveCuti':
    case 'saveCutiMultiple': {
      const rawList = payload.perijinanList || payload.cutiList || payload.list || (payload.cuti ? [payload.cuti] : (payload.perijinan ? [payload.perijinan] : [payload]));
      const list = rawList.map(c => {
        const tglMulai = c.tanggalMulai || c.tglMulai || c.tgl_mulai || new Date().toISOString().slice(0, 10);
        const tglSelesai = c.tanggalSelesai || c.tglSelesai || c.tgl_selesai || tglMulai;
        let days = Number(c.jumlahHari || c.jumlah_hari || 0);
        if (!days && tglMulai && tglSelesai) {
          const d1 = new Date(tglMulai);
          const d2 = new Date(tglSelesai);
          if (!isNaN(d1) && !isNaN(d2)) {
            days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
          } else {
            days = 1;
          }
        }
        const emp = (state.users || []).find(u => String(u.nik) === String(c.nik)) || (state.currentUser && String(state.currentUser.nik) === String(c.nik) ? state.currentUser : null);

        return {
          id: c.id || 'CUTI-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          nik: c.nik,
          nama: c.nama || (emp ? emp.nama : c.nik),
          divisi: c.divisi || (emp ? emp.divisi : ''),
          jenis: c.jenis || 'Cuti Tahunan',
          tgl_mulai: tglMulai,
          tgl_selesai: tglSelesai,
          jumlah_hari: days || 1,
          alasan: c.alasan || c.keterangan || '-',
          status: c.status || 'Diajukan',
          catatan: c.catatan || ''
        };
      });
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

      return { success: true, message: 'Pengajuan cuti / ijin berhasil disimpan' };
    }

    case 'updatePerijinan':
    case 'updateCuti':
    case 'editCuti': {
      const c = payload.cuti || payload.perijinan || payload;
      const tglMulai = c.tanggalMulai || c.tglMulai || c.tgl_mulai || '';
      const tglSelesai = c.tanggalSelesai || c.tglSelesai || c.tgl_selesai || tglMulai;
      let days = Number(c.jumlahHari || c.jumlah_hari || 0);
      if (!days && tglMulai && tglSelesai) {
        const d1 = new Date(tglMulai);
        const d2 = new Date(tglSelesai);
        if (!isNaN(d1) && !isNaN(d2)) {
          days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
        } else {
          days = 1;
        }
      }
      const patchData = {
        jenis: c.jenis || 'Cuti Tahunan',
        tgl_mulai: tglMulai,
        tgl_selesai: tglSelesai,
        jumlah_hari: days || 1,
        alasan: c.alasan || c.keterangan || '-',
        status: c.status || 'Diajukan',
        catatan: c.catatan || ''
      };
      if (c.approvedBy || c.approved_by) {
        patchData.approved_by = c.approvedBy || c.approved_by;
        patchData.approved_at = new Date().toISOString();
      }
      await supabaseFetch(`perijinan_cuti?id=eq.${encodeURIComponent(c.id)}`, {
        method: 'PATCH',
        body: patchData
      });
      return { success: true, message: 'Data perijinan/cuti berhasil diperbarui' };
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

    case 'deletePerijinan':
    case 'deleteCuti': {
      await supabaseFetch(`perijinan_cuti?id=eq.${encodeURIComponent(payload.id)}`, { method: 'DELETE' });
      return { success: true, message: 'Data cuti / ijin berhasil dihapus' };
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

    case 'generateMonthlyPayroll': {
      const periode = payload.periode;
      if (!periode) throw new Error('Periode payroll harus ditentukan');

      const [pYear, pMonth] = periode.split('-').map(Number);
      const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
      const prevYear = pMonth === 1 ? pYear - 1 : pYear;

      const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-26`;
      const endDate = `${pYear}-${String(pMonth).padStart(2, '0')}-25`;

      const users = await supabaseFetch('karyawan?select=*');
      const lemburRows = await supabaseFetch(`lembur?tanggal=gte.${startDate}&tanggal=lte.${endDate}`);
      const kasbonRows = await supabaseFetch('kasbon?status=eq.Aktif');

      const payrollList = [];
      for (const u of users) {
        if (u.role === 'admin' && u.nik === 'admin') continue;

        // Lembur
        const userLembur = (lemburRows || []).filter(l => String(l.nik).trim() === String(u.nik).trim());
        let totalJam = 0;
        userLembur.forEach(l => {
          totalJam += Number(l.durasi_jam || 0);
        });

        const rateLembur = Number(u.rate_lembur || 25000);
        const totalUangLembur = Math.round(totalJam * rateLembur);

        // Kasbon
        const userKasbon = (kasbonRows || []).filter(k => String(k.nik).trim() === String(u.nik).trim());
        let totalPotKasbon = 0;
        userKasbon.forEach(k => {
          const cicil = Number(k.cicilan || 0);
          const sisa = Number(k.sisa_saldo || 0);
          totalPotKasbon += Math.min(cicil, sisa > 0 ? sisa : cicil);
        });

        const gajiPokok = Number(u.gaji_pokok || 0);
        const tunjangan = Number(u.tunjangan || 0);
        const potonganAbsensi = 0;
        const potonganLain = 0;
        const gajiBersih = (gajiPokok + tunjangan + totalUangLembur) - (totalPotKasbon + potonganAbsensi + potonganLain);

        payrollList.push({
          id: `PAY-${periode}-${u.nik}`,
          periode,
          nik: u.nik,
          nama: u.nama,
          divisi: u.divisi || 'Warehouse',
          gaji_pokok: gajiPokok,
          tunjangan,
          total_jam_lembur: Number(totalJam.toFixed(2)),
          rate_lembur: rateLembur,
          uang_lembur: totalUangLembur,
          potongan_kasbon: totalPotKasbon,
          potongan_absensi: potonganAbsensi,
          potongan_lain: potonganLain,
          gaji_bersih: gajiBersih,
          status: 'Draft',
          catatan: `Periode ${startDate} s/d ${endDate}`
        });
      }

      if (payrollList.length > 0) {
        await supabaseFetch('payroll?on_conflict=periode,nik', {
          method: 'POST',
          headers: { 'Prefer': 'resolution=merge-duplicates' },
          body: payrollList
        });
      }

      return { success: true, message: `Payroll periode ${periode} (${payrollList.length} karyawan) berhasil di-generate!` };
    }

    case 'savePayrollAdjustment':
    case 'updatePayrollAdjustment': {
      const p = payload.adj || payload;
      const gPokok = Number(p.gajiPokok || 0);
      const tunj = Number(p.tunjangan || 0);
      const jamLembur = Number(p.totalJamLembur || 0);
      const rateLembur = Number(p.rateLembur || 25000);
      const uangLembur = Math.round(jamLembur * rateLembur);
      const potKasbon = Number(p.potonganKasbon || 0);
      const potAbsen = Number(p.potonganAbsensi || 0);
      const potLain = Number(p.potonganLain || 0);
      const gBersih = (gPokok + tunj + uangLembur) - (potKasbon + potAbsen + potLain);

      await supabaseFetch(`payroll?id=eq.${encodeURIComponent(p.id)}`, {
        method: 'PATCH',
        body: {
          gaji_pokok: gPokok,
          tunjangan: tunj,
          total_jam_lembur: jamLembur,
          rate_lembur: rateLembur,
          uang_lembur: uangLembur,
          potongan_kasbon: potKasbon,
          potongan_absensi: potAbsen,
          potongan_lain: potLain,
          gaji_bersih: gBersih,
          catatan: p.catatan || '',
          updated_at: new Date().toISOString()
        }
      });
      return { success: true, message: 'Penyesuaian payroll berhasil disimpan' };
    }

    case 'approvePayroll':
    case 'approvePayrollFinance': {
      await supabaseFetch(`payroll?periode=eq.${encodeURIComponent(payload.periode)}`, {
        method: 'PATCH',
        body: {
          status: 'Disetujui',
          updated_at: new Date().toISOString()
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
  const savedTheme = localStorage.getItem('theme') || 'light';
  htmlEl.setAttribute('data-theme', savedTheme);
  const btn = document.getElementById('themeToggleBtn');
  if (btn) btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}
const btnTheme = document.getElementById('themeToggleBtn');
if (btnTheme) {
  btnTheme.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme');
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', nextTheme);
    btnTheme.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('theme', nextTheme);
  });
}

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

function updateAttendanceStatusBox() {
  const statusBox = document.getElementById('todayAttendanceStatusBox');
  if (!statusBox || !state.currentUser) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const myRecordToday = state.absensi.find(a => 
    String(a.nik).trim() === String(state.currentUser.nik).trim() && 
    (a.tanggal === todayStr || (a.createdAt && a.createdAt.startsWith(todayStr)))
  );

  if (!myRecordToday) {
    statusBox.className = 'attendance-status-badge';
    statusBox.innerHTML = `⚪ <strong>Belum Melakukan Presensi Hari Ini</strong>. Silakan pilih shift dan klik tombol <em>🟢 Presensi Masuk</em>.`;
  } else if (myRecordToday.jamMasuk && (!myRecordToday.jamPulang || myRecordToday.jamPulang === '-')) {
    const isLate = Number(myRecordToday.keterlambatanMenit || 0) > 0;
    statusBox.className = 'attendance-status-badge checked-in';
    statusBox.innerHTML = `🟢 <strong>Sudah Presensi Masuk:</strong> Pukul <span class="mono-text">${myRecordToday.jamMasuk}</span> (${myRecordToday.shift || 'Shift 1'})${isLate ? ` • <span style="color:var(--error);">Terlambat ${myRecordToday.keterlambatanMenit} menit</span>` : ' • <span style="color:var(--success);">Tepat Waktu</span>'}. Jangan lupa presensi pulang saat jam kerja berakhir.`;
  } else if (myRecordToday.jamMasuk && myRecordToday.jamPulang && myRecordToday.jamPulang !== '-') {
    statusBox.className = 'attendance-status-badge completed';
    statusBox.innerHTML = `✅ <strong>Presensi Hari Ini Selesai:</strong> Masuk <span class="mono-text">${myRecordToday.jamMasuk}</span> • Pulang <span class="mono-text">${myRecordToday.jamPulang}</span> (${myRecordToday.shift || 'Shift 1'}).`;
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
    badgeEl.textContent = `${schedule.shift} (${schedule.masuk || '08:00'} - ${schedule.pulang || '17:00'})`;
    badgeEl.className = `status ${schedule.isOff ? 'ditolak' : 'disetujui'}`;
  }
  if (textEl) {
    textEl.textContent = schedule.isOff ? 'HARI INI LIBUR' : `${schedule.masuk || '08:00'} - ${schedule.pulang || '17:00'}`;
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
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const rosterItem = state.roster.find(r => String(r.nik).trim() === String(state.currentUser.nik).trim() && r.tanggal === dStr);
      
      const sc = rosterItem 
        ? { shift: rosterItem.shift, masuk: rosterItem.jamMasuk, pulang: rosterItem.jamPulang, isOff: rosterItem.shift.toLowerCase().includes('libur') }
        : getShiftScheduleForDate(defaultShift, d);

      const dNum = d.getDate();
      const mName = monthNames[d.getMonth()];
      const dayName = dayNames[d.getDay()];

      days.push(`
        <div class="roster-day-card ${i === 0 ? 'today' : ''}">
          ${i === 0 ? '<span class="roster-today-tag">Hari Ini</span>' : ''}
          <div class="roster-card-header">
            <span class="roster-day-name">${dayName}</span>
            <span class="roster-day-date">${dNum} ${mName}</span>
          </div>
          <span class="roster-shift-badge ${sc.isOff ? 'off' : 'work'}">
            ${sc.isOff ? 'LIBUR' : sc.shift}
          </span>
          <span class="roster-time-range mono-text">
            ${sc.isOff ? 'Off Duty' : `${sc.masuk || '08:00'} - ${sc.pulang || '17:00'}`}
          </span>
        </div>
      `);
    }
    timelineEl.innerHTML = days.join('');
  }

  updateAttendanceStatusBox();
  syncUserActiveShiftSelector();
}

let currentRosterDate = new Date();

window.prevRosterWeek = function() {
  currentRosterDate.setDate(currentRosterDate.getDate() - 7);
  renderAdminRosterTable();
};
window.nextRosterWeek = function() {
  currentRosterDate.setDate(currentRosterDate.getDate() + 7);
  renderAdminRosterTable();
};

function renderAdminRosterTable() {
  const wrap = document.getElementById('adminRosterTableWrap');
  if (!wrap) return;

  // Calculate week dates (Monday to Sunday)
  const d = new Date(currentRosterDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); 
  const startOfWeek = new Date(d.setDate(diff));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const nd = new Date(startOfWeek);
    nd.setDate(startOfWeek.getDate() + i);
    dates.push(nd);
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  
  const dateRangeStr = `${monthNames[dates[0].getMonth()]} ${dates[0].getDate()} - ${monthNames[dates[6].getMonth()]} ${dates[6].getDate()}`;

  // Group unique employees from state.roster
  const uniqueEmps = {};
  state.roster.forEach(r => {
    if (!uniqueEmps[r.nik]) {
      uniqueEmps[r.nik] = { nik: r.nik, nama: r.nama || '-' };
    }
  });
  
  window.rosterSortOrder = window.rosterSortOrder || 'nik';
  let empList = Object.values(uniqueEmps);
  if (window.rosterSortOrder === 'nama') {
    empList.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  } else {
    empList.sort((a, b) => (a.nik || '').localeCompare(b.nik || '', undefined, { numeric: true, sensitivity: 'base' }) || (a.nama || '').localeCompare(b.nama || ''));
  }

  let html = `
    <div class="roster-matrix-controls">
      <div style="display:flex; align-items:center; gap:16px;">
        <div class="roster-matrix-date">${dateRangeStr}</div>
        <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem; color:var(--text-secondary);">
          <span>Urutkan:</span>
          <select onchange="window.rosterSortOrder = this.value; renderAdminRosterTable();" style="padding:4px 8px; font-size:0.75rem; border-radius:var(--radius-xs); background:var(--bg-input); color:var(--text-primary); border:1px solid var(--border-color); cursor:pointer;">
            <option value="nik" ${window.rosterSortOrder === 'nik' ? 'selected' : ''}>NIK (WH0001, WH0002...)</option>
            <option value="nama" ${window.rosterSortOrder === 'nama' ? 'selected' : ''}>Nama (A - Z)</option>
          </select>
        </div>
      </div>
      <div class="roster-matrix-nav">
        <button onclick="prevRosterWeek()">&#10094;</button>
        <button onclick="currentRosterDate = new Date(); renderAdminRosterTable()">TODAY</button>
        <button onclick="nextRosterWeek()">&#10095;</button>
      </div>
    </div>
  `;

  if (empList.length === 0) {
    html += `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada data roster. Silakan import CSV terlebih dahulu.</p>`;
    wrap.innerHTML = html;
    return;
  }

  let tableHtml = `<div style="overflow-x: auto; overflow-y: hidden;"><table class="roster-matrix-table">
    <thead>
      <tr>
        <th class="emp-col">EMPLOYEES</th>
        ${dates.map(dt => `<th>${dayNames[dt.getDay()]} ${dt.getDate()}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
  `;

  empList.forEach(emp => {
    const avatar = emp.nama.substring(0, 2).toUpperCase();
    tableHtml += `<tr>
      <td class="emp-col">
        <div class="emp-avatar">${avatar}</div>
        <div style="line-height: 1.2;">
           <span style="font-size:0.8rem">${emp.nama}</span><br>
           <small style="font-size:0.65rem; color:var(--text-muted)">${emp.nik}</small>
        </div>
      </td>`;
      
    dates.forEach(dt => {
      // formatted date YYYY-MM-DD
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const dStr = String(dt.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dStr}`;
      
      const shiftData = state.roster.find(r => r.nik === emp.nik && r.tanggal === dateStr);
      
      if (shiftData) {
        const sLower = (shiftData.shift || '').toLowerCase();
        const isOff = sLower.includes('libur') || sLower === 'off' || sLower === 'cuti' || sLower === 'izin';
        
        let bgClass = 'shift-bg-off';
        if (!isOff) {
          if (sLower.includes('shift 1') || sLower === '1') bgClass = 'shift-bg-1';
          else if (sLower.includes('shift 2') || sLower === '2') bgClass = 'shift-bg-2';
          else if (sLower.includes('shift 3') || sLower === '3') bgClass = 'shift-bg-3';
          else bgClass = 'shift-bg-1';
        }

        const jam = (!isOff && shiftData.jamMasuk && shiftData.jamPulang) 
          ? `${shiftData.jamMasuk.substring(0,5)} - ${shiftData.jamPulang.substring(0,5)}` 
          : '';
        
        const shiftNameDisplay = shiftData.shift || (isOff ? 'Libur' : '-');

        tableHtml += `
          <td style="padding: 2px;">
            <div class="shift-block ${bgClass}" onclick="openEditRosterModal('${shiftData.id}')" style="position: relative;">
              <span style="position: absolute; top: 4px; right: 4px; font-size: 0.6rem; opacity: 0.5;">✏️</span>
              ${jam ? `<div class="shift-time">${jam}</div>` : ''}
              <div class="shift-name" style="${!jam ? 'font-size:0.75rem; font-weight:700;' : ''}">${shiftNameDisplay}</div>
            </div>
          </td>
        `;
      } else {
        tableHtml += `
          <td style="padding: 0;">
            <div class="roster-cell-empty" onclick="openAddRosterModal('${emp.nik}', '${emp.nama}', '${dateStr}')">+</div>
          </td>
        `;
      }
    });
    
    tableHtml += `</tr>`;
  });

  tableHtml += `</tbody></table></div>`;
  html += tableHtml;
  wrap.innerHTML = html;
}

window.deleteRosterShiftRecord = async (id) => {
  if (confirm('Hapus entri roster ini?')) {
    await apiRequest('deleteRosterShift', { id });
    loadRosterShifts();
  }
};

// ================= PRESENSI & ABSENSI =================
async function loadAbsensi() {
  if (!state.currentUser) return;
  const nik = state.currentUser.role === 'admin' ? '' : state.currentUser.nik;
  const res = await apiRequest('getAbsensi', { 
    nik: nik, 
    role: state.currentUser.role 
  });
  if (res) {
    state.absensi = res.data || [];
    renderUserAbsensi();
    if (state.currentUser.role === 'admin') renderAdminAbsensi();
    updateAttendanceStatusBox();
  }
}

async function loadShifts() {
  const res = await apiRequest('getShifts');
  if (res) {
    state.shifts = res.data || [];
    renderShiftDropdowns();
    if (state.currentUser && state.currentUser.role === 'admin') renderShiftTable();
  }
}

function renderShiftDropdowns() {
  const userSelect = document.getElementById('userActiveShiftSelect');
  const manualSelect = document.getElementById('m_abs_shift');
  const editAbsSelect = document.getElementById('editAbs_shift');
  
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
    syncUserActiveShiftSelector();
  }
  if (manualSelect) {
    manualSelect.innerHTML = optionsHtml;
  }
  if (editAbsSelect) {
    editAbsSelect.innerHTML = optionsHtml;
  }
}

function syncUserActiveShiftSelector() {
  const userSelect = document.getElementById('userActiveShiftSelect');
  const labelSpan = document.getElementById('userActiveShiftLabel');
  if (!userSelect || !state.currentUser) return;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const myRosterToday = (state.roster || []).find(r => 
    String(r.nik).trim() === String(state.currentUser.nik).trim() && 
    r.tanggal === todayStr
  );

  let targetShift = '';
  let targetMasuk = '08:00';
  let targetPulang = '17:00';

  if (myRosterToday && myRosterToday.shift && !myRosterToday.shift.toLowerCase().includes('libur')) {
    targetShift = myRosterToday.shift;
    targetMasuk = myRosterToday.jamMasuk || '08:00';
    targetPulang = myRosterToday.jamPulang || '17:00';
  } else if (!myRosterToday) {
    const sc = getShiftScheduleForDate('Shift 1', today);
    if (!sc.isOff) {
      targetShift = sc.shift;
      targetMasuk = sc.masuk;
      targetPulang = sc.pulang;
    }
  }

  if (targetShift) {
    let found = false;
    for (let i = 0; i < userSelect.options.length; i++) {
      const optVal = userSelect.options[i].value.toLowerCase();
      if (optVal === targetShift.toLowerCase() || optVal.includes(targetShift.toLowerCase())) {
        userSelect.selectedIndex = i;
        found = true;
        break;
      }
    }

    if (!found) {
      const newOpt = document.createElement('option');
      newOpt.value = targetShift;
      newOpt.dataset.masuk = targetMasuk;
      newOpt.dataset.pulang = targetPulang;
      newOpt.dataset.tol = '15';
      newOpt.textContent = `${targetShift} (${targetMasuk} - ${targetPulang})`;
      userSelect.appendChild(newOpt);
      userSelect.value = targetShift;
    }
  }

  const isAdmin = state.currentUser.role === 'admin';
  if (isAdmin) {
    userSelect.disabled = false;
    if (labelSpan) {
      labelSpan.innerHTML = `Pilih Shift Kerja Hari Ini <span style="background:var(--accent-primary);color:#fff;font-size:0.72rem;padding:2px 7px;border-radius:12px;margin-left:6px;font-weight:600;">👑 Admin: Bebas Pilih</span>`;
    }
  } else {
    userSelect.disabled = true;
    if (labelSpan) {
      labelSpan.innerHTML = `Shift Kerja Hari Ini <span style="background:var(--success);color:#fff;font-size:0.72rem;padding:2px 7px;border-radius:12px;margin-left:6px;font-weight:600;">🔒 Sesuai Jadwal Shift</span>`;
    }
  }
}

function renderUserAbsensi() {
  const wrap = document.getElementById('userAbsensiTableWrap');
  if (!wrap || !state.currentUser) return;

  const currentNik = String(state.currentUser.nik || '').trim().toUpperCase();
  const data = state.absensi.filter(a => String(a.nik || '').trim().toUpperCase() === currentNik);

  if (!data.length) {
    wrap.innerHTML = `<p style="padding: 24px; text-align: center; color: var(--text-muted);">Belum ada riwayat presensi.</p>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead><tr><th>Tanggal</th><th>Shift</th><th>Presensi Masuk</th><th>Presensi Pulang</th><th>Status</th><th>Keterlambatan</th></tr></thead>
      <tbody>
        ${data.map(a => `
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
      <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Shift</th><th>Presensi Masuk</th><th>Presensi Pulang</th><th>Status</th><th>Terlambat</th><th>Aksi</th></tr></thead>
      <tbody>
        ${state.absensi.map(a => `
          <tr>
            <td><strong>${a.nama || '-'}</strong><br><small class="mono-text">${a.nik}</small></td>
            <td><span class="mono-text">${a.tanggal}</span></td>
            <td><strong>${a.shift}</strong></td>
            <td><span class="mono-text">${a.jamMasuk || '-'}</span></td>
            <td><span class="mono-text">${a.jamPulang || '-'}</span></td>
            <td><span class="status ${a.status === 'Hadir' ? 'disetujui' : 'ditolak'}">${a.status}</span></td>
            <td><span class="mono-text">${Number(a.keterlambatanMenit || 0) > 0 ? a.keterlambatanMenit + ' mnt' : '-'}</span></td>
            <td class="action-cell">
              <div class="action-cell-group">
                <button class="action-btn edit" onclick="openEditAbsensi('${a.id}')">✏️ Edit</button>
                <button class="action-btn delete" onclick="deleteAbsensiRecord('${a.id}')">🗑️ Hapus</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Check-in & Check-out events with button loading state
const btnCheckInEl = document.getElementById('btnCheckIn');
if (btnCheckInEl) {
  btnCheckInEl.addEventListener('click', async () => {
    setButtonLoading(btnCheckInEl, true, 'Memproses Masuk...');

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
    setButtonLoading(btnCheckInEl, false);
    if (res) {
      showToast('Presensi Masuk Berhasil!');
      loadAbsensi();
    }
  });
}

const btnCheckOutEl = document.getElementById('btnCheckOut');
if (btnCheckOutEl) {
  btnCheckOutEl.addEventListener('click', async () => {
    setButtonLoading(btnCheckOutEl, true, 'Memproses Pulang...');

    const res = await apiRequest('checkOutAbsensi', { nik: state.currentUser.nik });
    setButtonLoading(btnCheckOutEl, false);
    if (res) {
      showToast('Presensi Pulang Berhasil!');
      loadAbsensi();
    }
  });
}

window.deleteAbsensiRecord = async (id) => {
  if (confirm('Hapus log presensi ini?')) {
    await apiRequest('deleteAbsensi', { id });
    loadAbsensi();
  }
};

window.openEditAbsensi = function(id) {
  const a = (state.absensi || []).find(x => String(x.id) === String(id));
  if (!a) {
    showToast('Data presensi tidak ditemukan', 'error');
    return;
  }

  document.getElementById('editAbs_id').value = a.id || '';
  document.getElementById('editAbs_nik').value = a.nik || '';
  document.getElementById('editAbs_nama').value = a.nama ? `${a.nama} (${a.nik})` : a.nik;
  document.getElementById('editAbs_tanggal').value = a.tanggal || '';
  document.getElementById('editAbs_status').value = a.status || 'Hadir';
  document.getElementById('editAbs_jamMasuk').value = a.jamMasuk || '';
  document.getElementById('editAbs_jamPulang').value = (a.jamPulang && a.jamPulang !== '-') ? a.jamPulang : '';
  document.getElementById('editAbs_keterlambatan').value = a.keterlambatanMenit || 0;
  document.getElementById('editAbs_catatan').value = a.catatan || '';

  // Populate shift dropdown
  const shiftSelect = document.getElementById('editAbs_shift');
  if (shiftSelect) {
    const shiftList = (state.shifts && state.shifts.length) ? state.shifts : [
      { namaShift: 'Shift 1', jamMasuk: '08:00', jamPulang: '17:00', toleransi: 15 },
      { namaShift: 'Shift 2', jamMasuk: '09:00', jamPulang: '18:00', toleransi: 15 },
      { namaShift: 'Shift 3', jamMasuk: '12:00', jamPulang: '21:00', toleransi: 15 }
    ];

    shiftSelect.innerHTML = shiftList.map(s => `
      <option value="${s.namaShift}" data-masuk="${s.jamMasuk}" data-pulang="${s.jamPulang}" data-tol="${s.toleransi || s.toleransiMenit || 15}">
        ${s.namaShift} (${s.jamMasuk} - ${s.jamPulang})
      </option>
    `).join('');

    let matched = false;
    for (let i = 0; i < shiftSelect.options.length; i++) {
      if (shiftSelect.options[i].value.toLowerCase() === (a.shift || '').toLowerCase()) {
        shiftSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched && a.shift) {
      const opt = document.createElement('option');
      opt.value = a.shift;
      opt.textContent = a.shift;
      shiftSelect.appendChild(opt);
      shiftSelect.value = a.shift;
    }
  }

  document.getElementById('editAbsensiModal').classList.remove('hidden');
};

window.onEditAbsensiShiftChanged = function() {
  const shiftSelect = document.getElementById('editAbs_shift');
  const opt = shiftSelect ? shiftSelect.selectedOptions[0] : null;
  const jamMasukInput = document.getElementById('editAbs_jamMasuk');
  const jamPulangInput = document.getElementById('editAbs_jamPulang');

  if (opt && opt.dataset.masuk && !jamMasukInput.value) {
    jamMasukInput.value = opt.dataset.masuk;
  }
  if (opt && opt.dataset.pulang && !jamPulangInput.value) {
    jamPulangInput.value = opt.dataset.pulang;
  }
  recalcEditAbsensiLate();
};

window.recalcEditAbsensiLate = function() {
  const shiftSelect = document.getElementById('editAbs_shift');
  const opt = shiftSelect ? shiftSelect.selectedOptions[0] : null;
  const jamMasuk = document.getElementById('editAbs_jamMasuk').value;
  const statusSelect = document.getElementById('editAbs_status');
  const ketInput = document.getElementById('editAbs_keterlambatan');

  if (!jamMasuk || !opt || !opt.dataset.masuk) return;

  const [jmH, jmM] = jamMasuk.split(':').map(Number);
  const [shH, shM] = opt.dataset.masuk.split(':').map(Number);
  const tol = Number(opt.dataset.tol || 15);

  const masukTotal = jmH * 60 + (jmM || 0);
  const shiftTotal = shH * 60 + (shM || 0);
  const diff = masukTotal - shiftTotal;

  if (diff > tol) {
    ketInput.value = diff;
    if (statusSelect.value === 'Hadir') {
      statusSelect.value = 'Terlambat';
    }
  } else {
    ketInput.value = 0;
    if (statusSelect.value === 'Terlambat') {
      statusSelect.value = 'Hadir';
    }
  }
};

const editAbsForm = document.getElementById('editAbsensiForm');
if (editAbsForm) {
  editAbsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveEditAbsensi');
    setButtonLoading(btn, true, 'Menyimpan...');

    const payload = {
      id: document.getElementById('editAbs_id').value,
      nik: document.getElementById('editAbs_nik').value,
      tanggal: document.getElementById('editAbs_tanggal').value,
      shift: document.getElementById('editAbs_shift').value,
      status: document.getElementById('editAbs_status').value,
      jamMasuk: document.getElementById('editAbs_jamMasuk').value,
      jamPulang: document.getElementById('editAbs_jamPulang').value,
      keterlambatanMenit: Number(document.getElementById('editAbs_keterlambatan').value || 0),
      catatan: document.getElementById('editAbs_catatan').value
    };

    const res = await apiRequest('updateAbsensi', payload);
    setButtonLoading(btn, false);
    if (res) {
      showToast('Data presensi berhasil diperbarui!');
      closeModal('editAbsensiModal');
      loadAbsensi();
    }
  });
}

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

const btnOpenAddShift = document.getElementById('btnOpenAddShiftModal');
if (btnOpenAddShift) {
  btnOpenAddShift.addEventListener('click', () => {
    const form = document.getElementById('addShiftForm');
    if (form) form.reset();
    const idEl = document.getElementById('shift_id');
    if (idEl) idEl.value = '';
    const modal = document.getElementById('addShiftModal');
    if (modal) modal.classList.remove('hidden');
  });
}

const addShiftF = document.getElementById('addShiftForm');
if (addShiftF) {
  addShiftF.addEventListener('submit', async (e) => {
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
}

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

const btnDlShiftTpl = document.getElementById('btnDownloadShiftTemplate');
if (btnDlShiftTpl) {
  btnDlShiftTpl.addEventListener('click', () => {
    const today = new Date();
    const startStr = today.toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + 6);
    const endStr = end.toISOString().slice(0, 10);

    const startInput = document.getElementById('tpl_shift_start') || document.getElementById('tpl_shift_start_date');
    const endInput = document.getElementById('tpl_shift_end') || document.getElementById('tpl_shift_end_date');
    if (startInput) startInput.value = startStr;
    if (endInput) endInput.value = endStr;

    const modal = document.getElementById('downloadShiftTemplateModal');
    if (modal) modal.classList.remove('hidden');
  });
}

const formDlShiftTpl = document.getElementById('downloadShiftTemplateForm');
if (formDlShiftTpl) {
  formDlShiftTpl.addEventListener('submit', (e) => {
    e.preventDefault();
    executeDownloadShiftTemplate();
  });
}

function executeDownloadShiftTemplate() {
  const startEl = document.getElementById('tpl_shift_start') || document.getElementById('tpl_shift_start_date');
  const endEl = document.getElementById('tpl_shift_end') || document.getElementById('tpl_shift_end_date');
  const startVal = startEl ? startEl.value : '';
  const endVal = endEl ? endEl.value : '';
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

const btnExpShift = document.getElementById('btnExportShiftCsv');
if (btnExpShift) {
  btnExpShift.addEventListener('click', () => {
    if (!state.roster.length) return showToast('Belum ada data roster untuk diexport!', 'error');
    const header = 'NIK,Nama,Tanggal,Shift,JamMasuk,JamPulang,Keterangan\n';
    const rows = state.roster.map(r => `"${r.nik}","${r.nama}","${r.tanggal}","${r.shift}","${r.jamMasuk}","${r.jamPulang}","${r.keterangan || ''}"`).join('\n');
    downloadCsv('export_roster_shift_warehouse.csv', header + rows);
  });
}

const btnOpenImpShift = document.getElementById('btnOpenImportShiftModal');
if (btnOpenImpShift) {
  btnOpenImpShift.addEventListener('click', () => {
    const fi = document.getElementById('shiftCsvFileInput');
    if (fi) fi.value = '';
    const pw = document.getElementById('shiftImportPreviewWrap');
    if (pw) pw.style.display = 'none';
    const ex = document.getElementById('btnExecuteImportShift');
    if (ex) ex.disabled = true;
    state.pendingShiftImport = [];
    const modal = document.getElementById('importShiftModal');
    if (modal) modal.classList.remove('hidden');
  });
}

const shiftCsvInp = document.getElementById('shiftCsvFileInput');
if (shiftCsvInp) {
  shiftCsvInp.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(l => l !== '');
    if (lines.length < 2) return showToast('File CSV kosong atau tidak valid', 'error');

    function parseFlexibleDate(str) {
      if (!str) return null;
      str = String(str).replace(/^["']|["']$/g, '').trim().replace(/^tgl[_\s:]*/i, '');
      
      // 1. YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
      let m = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
      if (m) {
        const y = m[1];
        const mo = String(m[2]).padStart(2, '0');
        const d = String(m[3]).padStart(2, '0');
        return `${y}-${mo}-${d}`;
      }

      // 2. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
      m = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})$/);
      if (m) {
        const d = String(m[1]).padStart(2, '0');
        const mo = String(m[2]).padStart(2, '0');
        const y = m[3];
        return `${y}-${mo}-${d}`;
      }

      // 3. DD/MM or DD-MM (assume current year 2026)
      m = str.match(/^(\d{1,2})[-/. ](\d{1,2})$/);
      if (m) {
        const d = String(m[1]).padStart(2, '0');
        const mo = String(m[2]).padStart(2, '0');
        return `2026-${mo}-${d}`;
      }

      // 4. DD-MMM-YYYY or DD-MMM-YY
      const monthMap = {
        jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05', jun: '06',
        jul: '07', agu: '08', ags: '08', aug: '08', sep: '09', okt: '10', oct: '10',
        nov: '11', des: '12', dec: '12'
      };
      m = str.match(/^(\d{1,2})[-/\s]([a-zA-Z]{3,})[-/\s]?(\d{2,4})?$/);
      if (m) {
        const d = String(m[1]).padStart(2, '0');
        const monStr = m[2].toLowerCase().slice(0, 3);
        const mo = monthMap[monStr];
        let y = m[3] || '2026';
        if (y.length === 2) y = '20' + y;
        if (mo) return `${y}-${mo}-${d}`;
      }

      // 5. Standard JS Date Parse
      const dt = new Date(str);
      if (!isNaN(dt.getTime()) && dt.getFullYear() > 2000 && dt.getFullYear() < 2100) {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${mo}-${d}`;
      }

      return null;
    }

    function parseCsvRow(rowStr, sep) {
      const cells = [];
      let inQuotes = false;
      let curr = '';
      for (let i = 0; i < rowStr.length; i++) {
        const char = rowStr[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === sep && !inQuotes) {
          cells.push(curr.trim().replace(/^["']|["']$/g, '').trim());
          curr = '';
        } else {
          curr += char;
        }
      }
      cells.push(curr.trim().replace(/^["']|["']$/g, '').trim());
      return cells;
    }

    // Helper untuk mencari jam masuk & pulang dari master_shift
    function resolveShiftHours(shiftName) {
      const sName = String(shiftName || '').trim();
      const sLower = sName.toLowerCase().replace(/["']/g, '');
      if (!sName || sLower === '-' || sLower === 'libur' || sLower === 'off' || sLower === 'l' || sLower === 'cuti' || sLower === 'ijin' || sLower === 'izin') {
        return { shift: (sLower === 'cuti' ? 'Cuti' : (sLower === 'ijin' || sLower === 'izin' ? 'Izin' : 'Libur')), jamMasuk: '', jamPulang: '' };
      }
      if (state.shifts && state.shifts.length) {
        const matched = state.shifts.find(s => s.namaShift.toLowerCase().trim() === sLower);
        if (matched) return { shift: matched.namaShift, jamMasuk: matched.jamMasuk, jamPulang: matched.jamPulang };
        const partial = state.shifts.find(s => s.namaShift.toLowerCase().replace(/\s+/g, '') === sLower.replace(/\s+/g, ''));
        if (partial) return { shift: partial.namaShift, jamMasuk: partial.jamMasuk, jamPulang: partial.jamPulang };
      }
      if (sLower === '1' || sLower === 'shift 1' || sLower === 'shift1' || sLower === 's1') {
        return { shift: 'Shift 1', jamMasuk: '08:00', jamPulang: '17:00' };
      }
      if (sLower === '2' || sLower === 'shift 2' || sLower === 'shift2' || sLower === 's2') {
        return { shift: 'Shift 2', jamMasuk: '09:00', jamPulang: '18:00' };
      }
      if (sLower === '3' || sLower === 'shift 3' || sLower === 'shift3' || sLower === 's3' || sLower === '3a' || sLower === 'shift 3a') {
        return { shift: 'Shift 3', jamMasuk: '12:00', jamPulang: '21:00' };
      }
      return { shift: sName, jamMasuk: '08:00', jamPulang: '17:00' };
    }

    // Auto-detect separator: comma or semicolon or tab
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) separator = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) separator = ';';
    else if (firstLine.includes(';')) {
      const countSemi = (firstLine.match(/;/g) || []).length;
      const countComma = (firstLine.match(/,/g) || []).length;
      separator = countSemi > countComma ? ';' : ',';
    }

    const rawHeaders = parseCsvRow(lines[0], separator);
    const lowerHeaders = rawHeaders.map(h => h.toLowerCase());
    const parsed = [];

    // Deteksi kolom tanggal
    const dateColIndexes = [];
    const metaCols = [];
    rawHeaders.forEach((h, idx) => {
      const parsedDate = parseFlexibleDate(h);
      if (parsedDate) {
        dateColIndexes.push({ idx, date: parsedDate });
      } else {
        metaCols.push(idx);
      }
    });

    if (dateColIndexes.length > 0) {
      // 1. FORMAT MATRIX: Nama, ID, Tgl1, Tgl2, ...
      let nikCol = lowerHeaders.findIndex(h => h === 'id' || h === 'nik' || h === 'id karyawan' || h === 'nik karyawan' || h === 'kode');
      let namaCol = lowerHeaders.findIndex(h => h === 'nama' || h === 'nama karyawan' || h === 'name' || h === 'karyawan');
      if (nikCol === -1 && namaCol === -1) {
        if (metaCols.length >= 2) {
          namaCol = metaCols[0];
          nikCol = metaCols[1];
        } else if (metaCols.length === 1) {
          nikCol = metaCols[0];
          namaCol = metaCols[0];
        } else {
          namaCol = 0;
          nikCol = 1;
        }
      } else if (nikCol === -1) {
        nikCol = metaCols.find(idx => idx !== namaCol) ?? (namaCol === 0 ? 1 : 0);
      } else if (namaCol === -1) {
        namaCol = metaCols.find(idx => idx !== nikCol) ?? (nikCol === 0 ? 1 : 0);
      }

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvRow(lines[i], separator);
        const nik = cols[nikCol] || '';
        const nama = cols[namaCol] || '';
        if (!nik && !nama) continue;

        dateColIndexes.forEach(({ idx, date }) => {
          const shiftVal = cols[idx];
          if (shiftVal && shiftVal !== '' && shiftVal !== '-') {
            const shiftInfo = resolveShiftHours(shiftVal);
            parsed.push({
              nik: nik || nama,
              nama: nama || nik,
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
      let nikCol = lowerHeaders.findIndex(h => h.includes('nik') || h === 'id');
      let namaCol = lowerHeaders.findIndex(h => h.includes('nama') || h === 'name');
      let tglCol = lowerHeaders.findIndex(h => h.includes('tgl') || h.includes('tanggal') || h.includes('date'));
      let shiftCol = lowerHeaders.findIndex(h => h.includes('shift'));
      let masukCol = lowerHeaders.findIndex(h => h.includes('masuk') || h.includes('start'));
      let pulangCol = lowerHeaders.findIndex(h => h.includes('pulang') || h.includes('end') || h.includes('keluar'));
      let ketCol = lowerHeaders.findIndex(h => h.includes('ket') || h.includes('keterangan') || h.includes('note'));

      if (nikCol === -1) nikCol = 0;
      if (namaCol === -1) namaCol = 1;
      if (tglCol === -1) tglCol = 2;
      if (shiftCol === -1) shiftCol = 3;
      if (masukCol === -1) masukCol = 4;
      if (pulangCol === -1) pulangCol = 5;
      if (ketCol === -1) ketCol = 6;

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvRow(lines[i], separator);
        if (cols.length >= 3) {
          const rawDate = cols[tglCol];
          const tanggal = parseFlexibleDate(rawDate);
          if (!tanggal) continue;

          const nik = cols[nikCol] || '';
          const nama = cols[namaCol] || '';
          if (!nik && !nama) continue;

          const shiftName = cols[shiftCol] || 'Shift 1';
          const shiftInfo = resolveShiftHours(shiftName);

          parsed.push({
            nik: nik || nama,
            nama: nama || nik,
            tanggal,
            shift: shiftInfo.shift,
            jamMasuk: cols[masukCol] || shiftInfo.jamMasuk,
            jamPulang: cols[pulangCol] || shiftInfo.jamPulang,
            keterangan: cols[ketCol] || ''
          });
        }
      }
    }

      if (!parsed.length) return showToast('Tidak ada data roster valid yang ditemukan dalam CSV', 'error');

      state.pendingShiftImport = parsed;
      const previewWrap = document.getElementById('shiftImportPreviewWrap');
      if (previewWrap) {
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
      }

      const execBtn = document.getElementById('btnExecuteImportShift');
      if (execBtn) execBtn.disabled = false;
    };
    reader.readAsText(file);
  });
}

const btnExecImpShift = document.getElementById('btnExecuteImportShift');
if (btnExecImpShift) {
  btnExecImpShift.addEventListener('click', async () => {
    if (!state.pendingShiftImport.length) return;
    setButtonLoading(btnExecImpShift, true, 'Mengimport...');

    const res = await apiRequest('importRosterShifts', { rosterList: state.pendingShiftImport });
    setButtonLoading(btnExecImpShift, false);
    if (res) {
      showToast(`Berhasil mengimport ${res.count || state.pendingShiftImport.length} jadwal roster!`);
      closeModal('importShiftModal');
      loadRosterShifts();
    }
  });
}

// ================= CSV IMPORT / EXPORT KARYAWAN =================
const btnDlUserTpl = document.getElementById('btnDownloadUserTemplate');
if (btnDlUserTpl) {
  btnDlUserTpl.addEventListener('click', () => {
    const header = 'NIK,Nama,Divisi,Username,Password,Role,Email,NoHP,GajiPokok,Tunjangan,RateLembur\n';
    const sample1 = 'WH0001,Admin Warehouse,Warehouse,admin,12345,admin,admin@warehouse.com,081234567890,4500000,500000,25000\n';
    const sample2 = 'WH0002,Budi Santoso,Inbound,budi,12345,user,budi@warehouse.com,081298765432,4200000,300000,25000\n';
    downloadCsv('template_data_karyawan_warehouse.csv', header + sample1 + sample2);
  });
}

const btnExpUser = document.getElementById('btnExportUserCsv');
if (btnExpUser) {
  btnExpUser.addEventListener('click', () => {
    if (!state.users.length) return showToast('Belum ada data karyawan untuk diexport!', 'error');
    const header = 'NIK,Nama,Divisi,Username,Password,Role,Email,NoHP,GajiPokok,Tunjangan,RateLembur\n';
    const rows = state.users.map(u => `"${u.nik}","${u.nama}","${u.divisi}","${u.username}","${u.password || ''}","${u.role}","${u.email || ''}","${u.noHp || ''}",${u.gajiPokok || 0},${u.tunjangan || 0},${u.rateLembur || 25000}`).join('\n');
    downloadCsv('export_data_karyawan_warehouse.csv', header + rows);
  });
}

const btnOpenImpUser = document.getElementById('btnOpenImportUserModal');
if (btnOpenImpUser) {
  btnOpenImpUser.addEventListener('click', () => {
    const fi = document.getElementById('userCsvFileInput');
    if (fi) fi.value = '';
    const pw = document.getElementById('userImportPreviewWrap');
    if (pw) pw.style.display = 'none';
    const ex = document.getElementById('btnExecuteImportUser');
    if (ex) ex.disabled = true;
    state.pendingUserImport = [];
    const modal = document.getElementById('importUserModal');
    if (modal) modal.classList.remove('hidden');
  });
}

const userCsvInput = document.getElementById('userCsvFileInput');
if (userCsvInput) {
  userCsvInput.addEventListener('change', (e) => {
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
      if (previewWrap) {
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
      }

      const execBtn = document.getElementById('btnExecuteImportUser');
      if (execBtn) execBtn.disabled = false;
    };
    reader.readAsText(file);
  });
}

const btnExecImpUser = document.getElementById('btnExecuteImportUser');
if (btnExecImpUser) {
  btnExecImpUser.addEventListener('click', async () => {
    if (!state.pendingUserImport.length) return;
    setButtonLoading(btnExecImpUser, true, 'Mengimport...');

    const res = await apiRequest('importUsersBulk', { userList: state.pendingUserImport });
    setButtonLoading(btnExecImpUser, false);
    if (res) {
      showToast(`Berhasil mengimport ${res.count || state.pendingUserImport.length} karyawan!`);
      closeModal('importUserModal');
      loadUsersData();
    }
  });
}

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
            <td><strong>${k.nama || '-'}</strong><br><small class="mono-text">${k.nik}</small></td>
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

const btnOpenAddKasbon = document.getElementById('btnOpenAddKasbonModal');
if (btnOpenAddKasbon) {
  btnOpenAddKasbon.addEventListener('click', () => {
    const select = document.getElementById('kasbon_nik');
    if (select) {
      select.innerHTML = state.users.filter(u => u.nik !== 'admin').map(u => `<option value="${u.nik}">${u.nik} - ${u.nama}</option>`).join('');
    }
    const form = document.getElementById('addKasbonForm');
    if (form) form.reset();
    const tgl = document.getElementById('kasbon_tanggal');
    if (tgl) tgl.value = new Date().toISOString().split('T')[0];
    const modal = document.getElementById('addKasbonModal');
    if (modal) modal.classList.remove('hidden');
  });
}

const addKasbonF = document.getElementById('addKasbonForm');
if (addKasbonF) {
  addKasbonF.addEventListener('submit', async (e) => {
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
}

window.deleteKasbonRecord = async (id) => {
  if (confirm('Hapus data kasbon ini?')) {
    await apiRequest('deleteKasbon', { id });
    loadKasbon();
    loadUsersData();
  }
};

// ================= PAYROLL & AUDIT GAJI =================
async function loadPayroll() {
  const picker = document.getElementById('payrollMonthPicker');
  const period = picker ? picker.value : new Date().toISOString().slice(0, 7);
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
              <td><strong>${p.nama || '-'}</strong><br><small class="mono-text">${p.nik}</small></td>
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
  const gb = document.getElementById('sumGajiBersih');
  if (gb) gb.textContent = formatRupiah(totalGaji);
  const ul = document.getElementById('sumUangLembur');
  if (ul) ul.textContent = formatRupiah(totalLembur);
  const pk = document.getElementById('sumPotonganKasbon');
  if (pk) pk.textContent = formatRupiah(totalKasbon);
  const statusEl = document.getElementById('payrollPeriodStatus');
  if (statusEl) {
    statusEl.textContent = statusStr;
    statusEl.className = `status ${statusStr.includes('Approved') || statusStr.includes('Disetujui') ? 'disetujui' : 'diajukan'}`;
  }
}

const btnGenPayroll = document.getElementById('btnGeneratePayroll');
if (btnGenPayroll) {
  btnGenPayroll.addEventListener('click', async () => {
    const period = document.getElementById('payrollMonthPicker').value;
    if (!period) return showToast('Pilih bulan payroll terlebih dahulu!', 'error');

    const [pYear, pMonth] = period.split('-').map(Number);
    const prevMonth = pMonth === 1 ? 12 : pMonth - 1;
    const prevYear  = pMonth === 1 ? pYear - 1 : pYear;
    const startLabel = `26 ${new Date(prevYear, prevMonth - 1).toLocaleString('id-ID', {month:'long', year:'numeric'})}`;
    const endLabel   = `25 ${new Date(pYear, pMonth - 1).toLocaleString('id-ID', {month:'long', year:'numeric'})}`;
    const rangeLabel = `${startLabel} – ${endLabel}`;

    setButtonLoading(btnGenPayroll, true, 'Menghitung...');

    const res = await apiRequest('generateMonthlyPayroll', { 
      periode: period, 
      adminUsername: state.currentUser.username 
    });
    setButtonLoading(btnGenPayroll, false);
    if (res) {
      showToast(`Payroll periode ${rangeLabel} berhasil di-generate!`);
      loadPayroll();
    }
  });
}

const btnApprovePay = document.getElementById('btnApprovePayrollFinance');
if (btnApprovePay) {
  btnApprovePay.addEventListener('click', async () => {
    const period = document.getElementById('payrollMonthPicker').value;
    if (!confirm(`Setujui seluruh payroll periode ${period} untuk diajukan ke Finance?`)) return;

    setButtonLoading(btnApprovePay, true, 'Menyetujui...');

    const res = await apiRequest('approvePayroll', { 
      periode: period, 
      adminUsername: state.currentUser.username 
    });
    setButtonLoading(btnApprovePay, false);
    if (res) {
      showToast(`Payroll periode ${period} telah disetujui & siap dibayarkan!`);
      loadPayroll();
    }
  });
}

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

const editPayrollF = document.getElementById('editPayrollForm');
if (editPayrollF) {
  editPayrollF.addEventListener('submit', async (e) => {
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
}

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

  const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setT('slip_periode', `Periode: ${p.periode}`);
  setT('slip_nik', p.nik);
  setT('slip_nama', p.nama);
  setT('slip_divisi', p.divisi || 'Warehouse');
  setT('slip_status', p.status || 'Draft');
  setT('slip_gapok', formatRupiah(p.gajiPokok));
  setT('slip_tunjangan', formatRupiah(p.tunjangan));
  setT('slip_jamLembur', p.totalJamLembur || 0);
  setT('slip_uangLembur', formatRupiah(p.totalUangLembur));
  setT('slip_potKasbon', formatRupiah(p.potonganKasbon));
  setT('slip_potLain', formatRupiah(totalPot - Number(p.potonganKasbon || 0)));
  setT('slip_gajiBersih', formatRupiah(p.gajiBersih));

  const modal = document.getElementById('slipGajiModal') || document.getElementById('viewSlipGajiModal');
  if (modal) modal.classList.remove('hidden');
};

const btnPrintSlip = document.getElementById('btnPrintSlipGaji') || document.getElementById('btnPrintSlipPdf');
if (btnPrintSlip) {
  btnPrintSlip.addEventListener('click', () => {
    if (state.selectedSlip) exportSingleSlipPdf(state.selectedSlip);
  });
}

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
const btnFinancePdf = document.getElementById('btnDownloadFinanceSummaryPdf');
if (btnFinancePdf) {
  btnFinancePdf.addEventListener('click', () => {
    if (!state.payroll.length) return showToast('Belum ada data payroll untuk diexport!', 'error');
    if (!window.jspdf || !window.jspdf.jsPDF) return showToast('Library PDF belum siap', 'error');

    const picker = document.getElementById('payrollMonthPicker');
    const period = picker ? picker.value : 'Periode';
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
}

// ================= DYNAMIC FORMS & SUBMISSIONS =================
const lemburContainer = document.getElementById('lemburListContainer');
function addLemburRow() {
  if (!lemburContainer) return;
  const rowId = 'lembur_' + Date.now() + Math.floor(Math.random()*1000);
  const today = new Date().toISOString().slice(0, 10);
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.id = rowId;
  div.style.position = 'relative';
  div.style.border = '1px solid var(--border-subtle)';
  div.style.padding = '24px 16px 16px';
  div.style.borderRadius = '8px';
  div.style.marginBottom = '16px';
  div.style.background = 'var(--bg-subtle)';
  div.innerHTML = `
    <button type="button" class="remove-row-btn" title="Hapus Baris" onclick="document.getElementById('${rowId}').remove()" style="position: absolute; top: 8px; right: 8px; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 4px; line-height: 1;">❌</button>
    <div class="grid two-columns" style="gap: 16px;">
      <label><span>Tanggal Lembur</span><input type="date" class="l_tanggal" value="${today}" required/></label>
      <label><span>Deskripsi Pekerjaan</span><input type="text" class="l_deskripsi" placeholder="Detail pekerjaan..." required/></label>
      <label><span>Jam Mulai</span><input type="time" class="l_jamMulai" required/></label>
      <label><span>Jam Selesai</span><input type="time" class="l_jamSelesai" required/></label>
      <label style="grid-column: 1 / -1;"><span>Catatan (Opsional)</span><input type="text" class="l_catatan" placeholder="Catatan tambahan..."/></label>
    </div>
  `;
  lemburContainer.appendChild(div);
}
document.getElementById('addLemburRowBtn')?.addEventListener('click', addLemburRow);

const cutiContainer = document.getElementById('cutiListContainer');
function addCutiRow() {
  if (!cutiContainer) return;
  const rowId = 'cuti_' + Date.now() + Math.floor(Math.random()*1000);
  const today = new Date().toISOString().slice(0, 10);
  const div = document.createElement('div');
  div.className = 'dynamic-row';
  div.id = rowId;
  div.style.position = 'relative';
  div.style.border = '1px solid var(--border-subtle)';
  div.style.padding = '24px 16px 16px';
  div.style.borderRadius = '8px';
  div.style.marginBottom = '16px';
  div.style.background = 'var(--bg-subtle)';
  div.innerHTML = `
    <button type="button" class="remove-row-btn" title="Hapus Baris" onclick="document.getElementById('${rowId}').remove()" style="position: absolute; top: 8px; right: 8px; background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: var(--text-muted); padding: 4px; line-height: 1;">❌</button>
    <div class="grid two-columns" style="gap: 16px;">
      <label><span>Jenis Pengajuan</span>
        <select class="c_jenis" required>
          <option value="Cuti Tahunan">Cuti Tahunan</option>
          <option value="Sakit">Sakit</option>
          <option value="Ijin">Ijin Lainnya</option>
        </select>
      </label>
      <label><span>Alasan / Keterangan</span><input type="text" class="c_alasan" placeholder="Cth: Keperluan keluarga" required/></label>
      <label><span>Tanggal Mulai</span><input type="date" class="c_tglMulai" value="${today}" required/></label>
      <label><span>Tanggal Selesai</span><input type="date" class="c_tglSelesai" value="${today}" required/></label>
    </div>
  `;
  cutiContainer.appendChild(div);
}
document.getElementById('addCutiRowBtn')?.addEventListener('click', addCutiRow);

const lemburF = document.getElementById('lemburForm');
if (lemburF) {
  lemburF.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitLemburBtn');
    const rows = lemburContainer ? Array.from(lemburContainer.querySelectorAll('.dynamic-row')) : [];
    if (rows.length === 0) return showToast('Tambahkan minimal 1 baris lembur!', 'error');

    setButtonLoading(btn, true, 'Menyimpan Lembur...');
    const nik = document.getElementById('l_nik')?.value || (state.currentUser ? state.currentUser.nik : '');
    const nama = document.getElementById('l_nama')?.value || (state.currentUser ? state.currentUser.nama : '');
    const divisi = document.getElementById('l_divisi')?.value || (state.currentUser ? state.currentUser.divisi : '');

    const lemburList = rows.map(row => {
      const mulai = row.querySelector('.l_jamMulai').value;
      const selesai = row.querySelector('.l_jamSelesai').value;
      const totalJam = calculateOvertime(mulai, selesai);

      return {
        nik, 
        nama, 
        divisi,
        tanggal: row.querySelector('.l_tanggal').value,
        deskripsi: row.querySelector('.l_deskripsi').value,
        jamMulai: mulai, 
        jamSelesai: selesai, 
        durasiJam: Number(totalJam),
        totalJam: `${totalJam} jam`,
        catatan: row.querySelector('.l_catatan')?.value || '',
        updatedBy: state.currentUser ? state.currentUser.username : ''
      };
    });

    const res = await apiRequest('saveLemburMultiple', { lemburList });
    setButtonLoading(btn, false);
    if (res && res.success !== false) {
      showToast('Pengajuan lembur berhasil disimpan!');
      if (lemburContainer) lemburContainer.innerHTML = ''; 
      addLemburRow();
      await loadLembur(); 
      switchTab('statusLemburTab');
    }
  });
}

const cutiF = document.getElementById('cutiForm');
if (cutiF) {
  cutiF.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitCutiBtn');
    const rows = cutiContainer ? Array.from(cutiContainer.querySelectorAll('.dynamic-row')) : [];
    if (rows.length === 0) return showToast('Tambahkan minimal 1 baris Ijin/Cuti!', 'error');

    setButtonLoading(btn, true, 'Mengajukan...');
    const nik = document.getElementById('c_nik')?.value || (state.currentUser ? state.currentUser.nik : '');
    const nama = document.getElementById('c_nama')?.value || (state.currentUser ? state.currentUser.nama : '');
    const divisi = document.getElementById('c_divisi')?.value || (state.currentUser ? state.currentUser.divisi : '');

    const perijinanList = rows.map(row => ({
      nik, 
      nama, 
      divisi,
      jenis: row.querySelector('.c_jenis').value, 
      alasan: row.querySelector('.c_alasan').value,
      tanggalMulai: row.querySelector('.c_tglMulai').value, 
      tanggalSelesai: row.querySelector('.c_tglSelesai').value,
      updatedBy: state.currentUser ? state.currentUser.username : ''
    }));

    const res = await apiRequest('savePerijinanMultiple', { perijinanList });
    setButtonLoading(btn, false);
    if (res && res.success !== false) {
      showToast('Ijin/Cuti berhasil diajukan!');
      if (cutiContainer) cutiContainer.innerHTML = ''; 
      addCutiRow();
      await loadCuti(); 
      switchTab('statusCutiTab');
    }
  });
}

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
          <th>Karyawan</th>
          <th>ID (NIK)</th>
          <th>Divisi</th>
          <th>Masa Kerja</th>
          <th>Username</th>
          <th>Password</th>
          <th>KPI Kehadiran</th>
          <th>Gaji Pokok</th>
          <th>Rate Lembur</th>
          <th>Kontak</th>
          <th>Role</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${state.users.map(u => {
          const kpi = calculateKPI(u.nik, 'thisMonth') || { totalScore: 0, grade: 'C', gradeClass: 'badge-kpi-grade-c' };
          const initials = (u.nama || 'WH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const tenure = calculateTenure(u.tglBergabung || u.tgl_bergabung);
          const avatarHtml = u.foto ? 
            `<div class="table-user-avatar cursor-pointer" onclick="openPhotoViewerByNik('${u.nik}')" title="Klik untuk lihat foto besar"><img src="${u.foto}" alt="${u.nama}" /></div>` :
            `<div class="table-user-avatar cursor-pointer" onclick="openPhotoViewerByNik('${u.nik}')" title="Klik untuk lihat foto besar">${initials}</div>`;

          return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 10px;">
                ${avatarHtml}
                <div>
                  <strong style="cursor: pointer;" onclick="openPhotoViewerByNik('${u.nik}')">${escapeHtml(u.nama)}</strong>
                  ${u.alamat ? `<br><small style="color:var(--text-muted); font-size:0.72rem;">🏠 ${escapeHtml(u.alamat).substring(0, 24)}</small>` : ''}
                </div>
              </div>
            </td>
            <td><span class="mono-text">${u.nik}</span></td>
            <td>${escapeHtml(u.divisi || 'Warehouse')}</td>
            <td>
              <span class="badge-tenure" title="Tgl Masuk: ${u.tglBergabung || u.tgl_bergabung || '-'}">
                ${tenure}
              </span>
              ${u.tglBergabung || u.tgl_bergabung ? `<br><small style="color: var(--text-muted); font-size: 0.7rem;">${u.tglBergabung || u.tgl_bergabung}</small>` : ''}
            </td>
            <td><span class="mono-text">${escapeHtml(u.username)}</span></td>
            <td><span class="mono-text" style="color: var(--accent-primary); font-weight: 600;">${escapeHtml(u.password || '-')}</span></td>
            <td>
              <span class="badge-kpi-grade ${kpi.gradeClass}" style="cursor:pointer;" onclick="openUserKpiDetail('${u.nik}')" title="Klik untuk lihat rincian KPI">
                ${kpi.grade} • ${kpi.totalScore}%
              </span>
            </td>
            <td><span class="mono-text">${formatRupiah(u.gajiPokok)}</span></td>
            <td><span class="mono-text">${formatRupiah(u.rateLembur || 25000)}/jam</span></td>
            <td>
              <span class="mono-text">${u.noHp || '-'}</span>
              ${u.email ? `<br><small style="color:var(--text-muted);">${u.email}</small>` : ''}
            </td>
            <td><span class="status ${u.role === 'admin' ? 'disetujui' : 'diajukan'}">${u.role}</span></td>
            <td class="action-cell">
              <div class="action-btn-group">
                <button class="action-btn" style="background: rgba(99, 102, 241, 0.12); color: var(--accent, #6366f1); border: 1px solid var(--accent, #6366f1);" onclick="openUserKpiDetail('${u.nik}')" title="Lihat Profil Lengkap & Evaluasi KPI">📊 KPI</button>
                <button class="action-btn edit" onclick="editUser('${u.nik}')">✏️ Edit</button>
                <button class="action-btn delete" onclick="deleteUserRecord('${u.nik}')">🗑️ Hapus</button>
              </div>
            </td>
          </tr>
        `}).join('')}
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
  if (document.getElementById('userTglBergabung')) document.getElementById('userTglBergabung').value = u.tglBergabung || u.tgl_bergabung || '';
  if (document.getElementById('userTglLahir')) document.getElementById('userTglLahir').value = u.tglLahir || u.tgl_lahir || '';
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

const userF = document.getElementById('userForm');
if (userF) {
  userF.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveUser');
    setButtonLoading(btn, true, 'Menyimpan...');

    const payload = {
      nik: document.getElementById('userNIK').value.trim(),
      nama: document.getElementById('userName').value.trim(),
      divisi: document.getElementById('userDivisi').value.trim(),
      tglBergabung: (document.getElementById('userTglBergabung')?.value || '').trim(),
      tglLahir: (document.getElementById('userTglLahir')?.value || '').trim(),
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
      userF.reset();
      const editMode = document.getElementById('userEditMode');
      if (editMode) editMode.value = "false";
      const formTitle = document.getElementById('userFormTitle');
      if (formTitle) formTitle.textContent = 'Tambah / Edit Data Karyawan & Gaji';
      loadUsersData();
    }
  });
}

const btnCancelUser = document.getElementById('btnCancelEditUser') || document.getElementById('resetUserFormBtn');
if (btnCancelUser) {
  btnCancelUser.addEventListener('click', () => {
    const form = document.getElementById('userForm');
    if (form) form.reset();
    const editMode = document.getElementById('userEditMode');
    if (editMode) editMode.value = "false";
    const formTitle = document.getElementById('userFormTitle');
    if (formTitle) formTitle.textContent = 'Tambah / Edit Data Karyawan & Gaji';
  });
}

// ================= MODAL & ACTIONS =================
window.closeModal = (modalId) => {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('hidden');
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
  const modal = document.getElementById('editLemburModal');
  if (modal) modal.classList.remove('hidden');
};

const editLemburF = document.getElementById('editLemburForm');
if (editLemburF) {
  editLemburF.addEventListener('submit', async (e) => {
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
}

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
  const modal = document.getElementById('editCutiModal');
  if (modal) modal.classList.remove('hidden');
};

const editCutiF = document.getElementById('editCutiForm');
if (editCutiF) {
  editCutiF.addEventListener('submit', async (e) => {
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
}

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

const btnDlStatusPdf = document.getElementById('downloadStatusPdfBtn');
if (btnDlStatusPdf) {
  btnDlStatusPdf.addEventListener('click', () => exportPdf(false));
}

const btnDlAdminPdf = document.getElementById('downloadAdminPdfBtn');
if (btnDlAdminPdf) {
  btnDlAdminPdf.addEventListener('click', () => exportPdf(true));
}

// ================= CSV EXPORTERS (LEMBUR, CUTI, ABSENSI, KASBON, PAYROLL) =================
const setupCsvExportListeners = () => {
  // 1. Export Lembur Saya (User)
  const btnUserLembur = document.getElementById('exportUserLemburCsvBtn');
  if (btnUserLembur) {
    btnUserLembur.addEventListener('click', () => {
      const rows = state.lembur.filter(r => r.nik === state.currentUser.nik);
      if (!rows.length) return showToast('Belum ada data lembur untuk diexport!', 'error');
      const header = 'Tanggal,Deskripsi,JamMulai,JamSelesai,TotalJam,Catatan,Status\n';
      const data = rows.map(r => `"${r.tanggal}","${(r.deskripsi || r.deskripsiPekerjaan || r.keterangan || '').replace(/"/g, '""')}","${r.jamMulai || ''}","${r.jamSelesai || ''}","${r.totalJam || ''}","${(r.catatan || '').replace(/"/g, '""')}","${r.status || 'Diajukan'}"`).join('\n');
      downloadCsv(`rekap_lembur_saya_${state.currentUser.nik}.csv`, header + data);
      showToast('Export CSV Lembur berhasil diunduh!');
    });
  }

  // 2. Export Semua Lembur (Admin)
  const btnAdminLembur = document.getElementById('exportAdminLemburCsvBtn');
  if (btnAdminLembur) {
    btnAdminLembur.addEventListener('click', () => {
      if (!state.lembur.length) return showToast('Belum ada data lembur untuk diexport!', 'error');
      const header = 'Nama,NIK,Divisi,Tanggal,Deskripsi,JamMulai,JamSelesai,TotalJam,Catatan,Status\n';
      const data = state.lembur.map(r => `"${r.nama || ''}","${r.nik || ''}","${r.divisi || ''}","${r.tanggal}","${(r.deskripsi || r.deskripsiPekerjaan || r.keterangan || '').replace(/"/g, '""')}","${r.jamMulai || ''}","${r.jamSelesai || ''}","${r.totalJam || ''}","${(r.catatan || '').replace(/"/g, '""')}","${r.status || 'Diajukan'}"`).join('\n');
      downloadCsv('rekap_seluruh_lembur_warehouse.csv', header + data);
      showToast('Export CSV Seluruh Lembur berhasil diunduh!');
    });
  }

  // 3. Export Cuti Tim (User)
  const btnUserCuti = document.getElementById('exportUserCutiCsvBtn');
  if (btnUserCuti) {
    btnUserCuti.addEventListener('click', () => {
      if (!state.cuti.length) return showToast('Belum ada data ijin/cuti untuk diexport!', 'error');
      const header = 'Nama,NIK,Divisi,Jenis,TanggalMulai,TanggalSelesai,Alasan,Status\n';
      const data = state.cuti.map(r => `"${r.nama || ''}","${r.nik || ''}","${r.divisi || ''}","${r.jenis || ''}","${r.tanggalMulai || r.tglMulai || ''}","${r.tanggalSelesai || r.tglSelesai || ''}","${(r.alasan || '').replace(/"/g, '""')}","${r.status || 'Diajukan'}"`).join('\n');
      downloadCsv('data_ijin_cuti_tim_warehouse.csv', header + data);
      showToast('Export CSV Ijin/Cuti berhasil diunduh!');
    });
  }

  // 4. Export Approval Cuti (Admin)
  const btnAdminCuti = document.getElementById('exportAdminCutiCsvBtn');
  if (btnAdminCuti) {
    btnAdminCuti.addEventListener('click', () => {
      if (!state.cuti.length) return showToast('Belum ada data cuti untuk diexport!', 'error');
      const header = 'Nama,NIK,Divisi,Jenis,TanggalMulai,TanggalSelesai,Alasan,Status\n';
      const data = state.cuti.map(r => `"${r.nama || ''}","${r.nik || ''}","${r.divisi || ''}","${r.jenis || ''}","${r.tanggalMulai || r.tglMulai || ''}","${r.tanggalSelesai || r.tglSelesai || ''}","${(r.alasan || '').replace(/"/g, '""')}","${r.status || 'Diajukan'}"`).join('\n');
      downloadCsv('rekap_approval_cuti_admin.csv', header + data);
      showToast('Export CSV Approval Cuti berhasil diunduh!');
    });
  }

  // 5. Export Presensi Saya (User)
  const btnUserAbs = document.getElementById('exportUserAbsensiCsvBtn');
  if (btnUserAbs) {
    btnUserAbs.addEventListener('click', () => {
      const rows = state.absensi.filter(a => a.nik === state.currentUser.nik);
      if (!rows.length) return showToast('Belum ada data presensi untuk diexport!', 'error');
      const header = 'Tanggal,Shift,JamMasuk,JamPulang,Status,KeterlambatanMenit\n';
      const data = rows.map(a => `"${a.tanggal}","${a.shift || ''}","${a.jamMasuk || ''}","${a.jamPulang || ''}","${a.status || ''}",${a.keterlambatanMenit || 0}`).join('\n');
      downloadCsv(`riwayat_presensi_${state.currentUser.nik}.csv`, header + data);
      showToast('Export CSV Presensi berhasil diunduh!');
    });
  }

  // 6. Export Semua Presensi (Admin)
  const btnAdminAbs = document.getElementById('exportAdminAbsensiCsvBtn');
  if (btnAdminAbs) {
    btnAdminAbs.addEventListener('click', () => {
      if (!state.absensi.length) return showToast('Belum ada data presensi untuk diexport!', 'error');
      const header = 'Nama,NIK,Tanggal,Shift,JamMasuk,JamPulang,Status,KeterlambatanMenit\n';
      const data = state.absensi.map(a => `"${a.nama || ''}","${a.nik || ''}","${a.tanggal}","${a.shift || ''}","${a.jamMasuk || ''}","${a.jamPulang || ''}","${a.status || ''}",${a.keterlambatanMenit || 0}`).join('\n');
      downloadCsv('rekap_seluruh_presensi_karyawan.csv', header + data);
      showToast('Export CSV Log Presensi berhasil diunduh!');
    });
  }

  // 7. Export Kasbon (Admin)
  const btnAdminKasbon = document.getElementById('exportAdminKasbonCsvBtn');
  if (btnAdminKasbon) {
    btnAdminKasbon.addEventListener('click', () => {
      if (!state.kasbon.length) return showToast('Belum ada data kasbon untuk diexport!', 'error');
      const header = 'Nama,NIK,TanggalPengajuan,JumlahPinjaman,CicilanPerBulan,SisaKasbon,Status,Catatan\n';
      const data = state.kasbon.map(k => `"${k.nama || ''}","${k.nik || ''}","${k.tanggalPengajuan}",${k.jumlahPinjaman || 0},${k.cicilanPerBulan || 0},${k.sisaKasbon || 0},"${k.status || ''}","${(k.catatan || '').replace(/"/g, '""')}"`).join('\n');
      downloadCsv('rekap_kasbon_karyawan.csv', header + data);
      showToast('Export CSV Kasbon berhasil diunduh!');
    });
  }

  // 8. Export Payroll Finance (Admin)
  const btnAdminPayroll = document.getElementById('exportAdminPayrollCsvBtn');
  if (btnAdminPayroll) {
    btnAdminPayroll.addEventListener('click', () => {
      if (!state.payroll.length) return showToast('Belum ada data payroll untuk diexport!', 'error');
      const period = document.getElementById('payrollMonthPicker').value || 'periode';
      const header = 'Nama,NIK,Divisi,Periode,GajiPokok,Tunjangan,TotalJamLembur,RateLembur,TotalUangLembur,PotonganKasbon,PotonganAbsensi,PotonganLain,GajiBersih,Status\n';
      const data = state.payroll.map(p => `"${p.nama || ''}","${p.nik || ''}","${p.divisi || ''}","${p.periode}",${p.gajiPokok || 0},${p.tunjangan || 0},${p.totalJamLembur || 0},${p.rateLembur || 25000},${p.totalUangLembur || 0},${p.potonganKasbon || 0},${p.potonganAbsensi || 0},${p.potonganLain || 0},${p.gajiBersih || 0},"${p.status || 'Draft'}"`).join('\n');
      downloadCsv(`rekap_payroll_finance_${period}.csv`, header + data);
      showToast('Export CSV Payroll berhasil diunduh!');
    });
  }

  // 9. Export Slip Gaji (User)
  const btnUserSlip = document.getElementById('exportUserSlipGajiCsvBtn');
  if (btnUserSlip) {
    btnUserSlip.addEventListener('click', () => {
      const rows = state.payroll.filter(p => String(p.nik).trim() === String(state.currentUser.nik).trim());
      if (!rows.length) return showToast('Belum ada data slip gaji untuk diexport!', 'error');
      const header = 'Periode,Nama,NIK,GajiPokok,Tunjangan,TotalJamLembur,TotalUangLembur,PotonganKasbon,PotonganAbsensi,PotonganLain,GajiBersih,Status\n';
      const data = rows.map(p => `"${p.periode}","${p.nama || state.currentUser.nama}","${p.nik || state.currentUser.nik}",${p.gajiPokok || 0},${p.tunjangan || 0},${p.totalJamLembur || 0},${p.totalUangLembur || 0},${p.potonganKasbon || 0},${p.potonganAbsensi || 0},${p.potonganLain || 0},${p.gajiBersih || 0},"${p.status || ''}"`).join('\n');
      downloadCsv(`riwayat_slip_gaji_${state.currentUser.nik}.csv`, header + data);
      showToast('Export CSV Slip Gaji berhasil diunduh!');
    });
  }
};
setupCsvExportListeners();

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
    if (state.users.length) select.dispatchEvent(new Event('change'));
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

    // User Labels & Badges
    if (state.currentUser) {
      updateUserInterfaceAvatars();

      const userLabel = document.getElementById('loggedUserLabel');
      if (userLabel) userLabel.textContent = state.currentUser.nama || 'Pengguna';

      const userRoleLabel = document.getElementById('loggedUserRole');
      if (userRoleLabel) userRoleLabel.textContent = state.currentUser.role === 'admin' ? 'Administrator' : 'Warehouse Staff';
      
      const sidebarName = document.getElementById('sidebarUserName');
      const sidebarRole = document.getElementById('sidebarUserRole');
      if (sidebarName) sidebarName.textContent = state.currentUser.nama || 'Pengguna';
      if (sidebarRole) sidebarRole.textContent = `${state.currentUser.divisi || 'Warehouse'} • ${state.currentUser.role || 'user'}`;
      
      // Role-Based Navigation Groups (Menu selain People & Attendance HANYA untuk Admin)
      const executiveGroup = document.getElementById('executiveNavGroup');
      const adminGroup = document.getElementById('adminNavGroup');
      const isAdmin = state.currentUser.role === 'admin';

      if (executiveGroup) executiveGroup.classList.toggle('hidden', !isAdmin);
      if (adminGroup) adminGroup.classList.toggle('hidden', !isAdmin);
    }

    startLiveClock();
    
    // Pastikan baris form lembur & cuti selalu siap minimal 1 baris
    if (lemburContainer && lemburContainer.querySelectorAll('.dynamic-row').length === 0) addLemburRow();
    if (cutiContainer && cutiContainer.querySelectorAll('.dynamic-row').length === 0) addCutiRow();

    // User diarahkan ke Presensi Harian, Admin diarahkan ke Dashboard
    if (state.currentUser && state.currentUser.role === 'admin') {
      switchTab('adminShiftAbsensiTab');
    } else {
      switchTab('presensiTab');
    }

    // Load data in parallel for maximum speed
    await Promise.allSettled([
      loadUsersData(),
      loadProfileRequests(),
      loadShifts(),
      loadRosterShifts(),
      loadAbsensi(),
      loadKasbon(),
      loadLembur(),
      loadCuti(),
      loadPayroll()
    ]);

    renderEmployeeShiftDashboard();
    renderUserProfileTab();
    updateAttendanceGatekeeper();
  } catch (err) {
    console.error('Error starting app:', err);
  }
}


// ================= PROFIL & PENILAIAN KPI KARYAWAN =================

function calculateKPI(nik, period = 'thisMonth') {
  if (!nik) return null;
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth(); // 0-indexed

  let filterFn = () => true;

  if (period === 'thisMonth') {
    const prefix = `${curY}-${String(curM + 1).padStart(2, '0')}`;
    filterFn = (tgl) => tgl && tgl.startsWith(prefix);
  } else if (period === 'lastMonth') {
    const lastMDate = new Date(curY, curM - 1, 1);
    const prefix = `${lastMDate.getFullYear()}-${String(lastMDate.getMonth() + 1).padStart(2, '0')}`;
    filterFn = (tgl) => tgl && tgl.startsWith(prefix);
  } else if (period === 'last3Months') {
    const minDate = new Date(curY, curM - 2, 1);
    const minStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, '0')}-01`;
    filterFn = (tgl) => tgl && tgl >= minStr;
  }

  // Filter Absensi Karyawan
  const userAbsensi = (state.absensi || []).filter(a => 
    String(a.nik).trim().toUpperCase() === String(nik).trim().toUpperCase() && filterFn(a.tanggal)
  );

  // Filter Roster Karyawan
  const userRoster = (state.roster || []).filter(r => 
    String(r.nik).trim().toUpperCase() === String(nik).trim().toUpperCase() && filterFn(r.tanggal)
  );

  // Filter Lembur Karyawan Disetujui
  const userLembur = (state.lembur || []).filter(l => 
    String(l.nik).trim().toUpperCase() === String(nik).trim().toUpperCase() && 
    (l.status === 'Disetujui' || l.status === 'Approve') && 
    filterFn(l.tanggal)
  );

  // Filter Cuti Karyawan Disetujui
  const userCuti = (state.cuti || []).filter(c => 
    String(c.nik).trim().toUpperCase() === String(nik).trim().toUpperCase() && 
    (c.status === 'Disetujui' || c.status === 'Approve') && 
    filterFn(c.tanggalMulai || c.tglMulai)
  );

  // Target Hari Kerja dari Roster (selain Libur/Off)
  const workRosters = userRoster.filter(r => {
    const s = String(r.shift || '').toLowerCase();
    return !s.includes('off') && !s.includes('libur') && !s.includes('cuti');
  });

  const totalTargetDays = workRosters.length > 0 ? workRosters.length : Math.max(userAbsensi.length, 1);

  // Perhitungan Presensi & Disiplin
  const totalHadir = userAbsensi.length;
  let tepatWaktu = 0;
  let terlambatCount = 0;
  let totalMenitTerlambat = 0;
  let lengkapCheckout = 0;

  userAbsensi.forEach(a => {
    const late = Number(a.keterlambatanMenit || a.terlambatMenit || 0);
    if (late <= 0) {
      tepatWaktu++;
    } else {
      terlambatCount++;
      totalMenitTerlambat += late;
    }

    if (a.jamPulang && a.jamPulang !== '-' && a.jamPulang.trim() !== '') {
      lengkapCheckout++;
    }
  });

  const totalJamLembur = userLembur.reduce((sum, l) => sum + Number(l.totalJam || 0), 0);
  const totalHariCuti = userCuti.reduce((sum, c) => sum + Number(c.totalHari || 1), 0);

  // Pilar 1: Attendance Rate (Bobot 40%)
  let attendanceRate = totalTargetDays > 0 ? Math.min(100, Math.round((totalHadir / totalTargetDays) * 100)) : (totalHadir > 0 ? 100 : 0);

  // Pilar 2: Punctuality Rate (Bobot 35%)
  let punctualityRate = totalHadir > 0 ? Math.round((tepatWaktu / totalHadir) * 100) : (totalTargetDays > 0 ? 0 : 100);
  if (totalMenitTerlambat > 120) {
    punctualityRate = Math.max(0, punctualityRate - Math.round((totalMenitTerlambat - 120) / 30) * 2);
  }

  // Pilar 3: Checkout Compliance (Bobot 15%)
  let checkoutCompliance = totalHadir > 0 ? Math.round((lengkapCheckout / totalHadir) * 100) : 100;

  // Pilar 4: Leave & Absence Index (Bobot 10%)
  let leaveIndex = 100;
  if (totalTargetDays > 0 && totalHadir < totalTargetDays) {
    const gap = totalTargetDays - totalHadir;
    if (gap > totalHariCuti) {
      leaveIndex = Math.max(0, 100 - (gap - totalHariCuti) * 20);
    }
  }

  // Skor Akhir KPI Terbobot (0 - 100)
  const totalScore = Math.round(
    (attendanceRate * 0.40) +
    (punctualityRate * 0.35) +
    (checkoutCompliance * 0.15) +
    (leaveIndex * 0.10)
  );

  // Penentuan Grade & Evaluasi Otomatis
  let grade = 'A';
  let gradeClass = 'badge-kpi-grade-a';
  let gradeTitle = 'Grade A (Sangat Baik)';
  let gradeDesc = 'Kedisiplinan & kehadiran teladan! Standar kerja dan ketepatan waktu terpenuhi dengan optimal.';
  let reviewNote = '🌟 <strong>Performa Sangat Baik!</strong> Anda mempertahankan tingkat kehadiran prima dan disiplin jam kerja yang konsisten.';

  if (totalScore >= 90) {
    grade = 'A';
    gradeClass = 'badge-kpi-grade-a';
    gradeTitle = '🌟 Grade A (Sangat Baik)';
    gradeDesc = 'Disiplin dan kehadiran teladan! Standar kerja dan ketepatan waktu terpenuhi dengan optimal.';
    reviewNote = `🌟 <strong>Performa Teladan (${totalScore}%):</strong> Kehadiran ${totalHadir}/${totalTargetDays} hari dengan ${tepatWaktu} kehadiran tepat waktu. Pertahankan standar kerja yang luar biasa ini!`;
  } else if (totalScore >= 75) {
    grade = 'B';
    gradeClass = 'badge-kpi-grade-b';
    gradeTitle = '🟢 Grade B (Baik)';
    gradeDesc = 'Tingkat kehadiran baik dan konsisten. Kurangi keterlambatan untuk meraih Grade A.';
    reviewNote = `🟢 <strong>Performa Baik (${totalScore}%):</strong> Kehadiran sudah cukup konsisten. ${terlambatCount > 0 ? `Terdapat ${terlambatCount} keterlambatan (${totalMenitTerlambat} menit) yang bisa diperbaiki di periode berikutnya.` : 'Pertahankan kedisiplinan Anda!'}`;
  } else if (totalScore >= 60) {
    grade = 'C';
    gradeClass = 'badge-kpi-grade-c';
    gradeTitle = '🟡 Grade C (Cukup)';
    gradeDesc = 'Terdapat beberapa catatan keterlambatan / absensi. Tingkatkan ketepatan waktu jam masuk.';
    reviewNote = `🟡 <strong>Perlu Perbaikan (${totalScore}%):</strong> Tingkat kehadiran atau ketepatan waktu masih di bawah target. Perhatikan toleransi jam masuk shift dan pastikan selalu presensi pulang.`;
  } else {
    grade = 'D';
    gradeClass = 'badge-kpi-grade-d';
    gradeTitle = '🔴 Grade D (Perlu Pembinaan)';
    gradeDesc = 'Tingkat kehadiran di bawah standar minimal. Perlu evaluasi bersama tim leader / HR.';
    reviewNote = `🔴 <strong>Evaluasi Khusus (${totalScore}%):</strong> Kehadiran sangat rendah atau frekuensi terlambat tinggi. Harap berkonsultasi dengan koordinator warehouse.`;
  }

  return {
    period,
    totalTargetDays,
    totalHadir,
    tepatWaktu,
    terlambatCount,
    totalMenitTerlambat,
    lengkapCheckout,
    totalJamLembur,
    totalHariCuti,
    attendanceRate,
    punctualityRate,
    checkoutCompliance,
    leaveIndex,
    totalScore,
    grade,
    gradeClass,
    gradeTitle,
    gradeDesc,
    reviewNote
  };
}

function calculateTenure(joinDateStr) {
  if (!joinDateStr) return '-';
  const start = new Date(joinDateStr);
  if (isNaN(start.getTime())) return '-';
  const now = new Date();
  if (start > now) return 'Baru bergabung';

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} Thn`);
  if (months > 0) parts.push(`${months} Bln`);
  if (parts.length === 0) {
    if (days > 0) parts.push(`${days} Hari`);
    else parts.push('< 1 Bln');
  }
  return parts.join(' ');
}

window.handleProfilePhotoUpload = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    return showToast('Harap pilih file gambar (JPG/PNG/WEBP)', 'error');
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Compress with Canvas (max 400x400)
      const canvas = document.createElement('canvas');
      const maxDimension = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        }
      } else {
        if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', 0.82);

      // 1. Update Preview DOM
      const avatarImg = document.getElementById('profileBigAvatarImg');
      const avatarText = document.getElementById('profileBigAvatarText');
      if (avatarImg) {
        avatarImg.src = base64;
        avatarImg.style.display = 'block';
      }
      if (avatarText) avatarText.style.display = 'none';

      // 2. Update state.currentUser
      state.currentUser.foto = base64;
      localStorage.setItem('currentUser', JSON.stringify(state.currentUser));

      const uInList = (state.users || []).find(x => x.nik === state.currentUser.nik);
      if (uInList) uInList.foto = base64;

      // 3. Save to Supabase & GAS
      apiRequest('saveUserProfile', { nik: state.currentUser.nik, foto: base64 });

      // 4. Update sidebar avatar & user table
      updateUserInterfaceAvatars();
      if (state.currentUser.role === 'admin') renderUserTable();

      showToast('📸 Foto profil berhasil diperbarui!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

function updateUserInterfaceAvatars() {
  if (!state.currentUser) return;
  const u = state.currentUser;
  const initials = (u.nama || 'WH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const sAvatar = document.getElementById('sidebarAvatarInitial');
  if (sAvatar) {
    if (u.foto) {
      sAvatar.innerHTML = `<img src="${u.foto}" alt="${u.nama}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />`;
    } else {
      sAvatar.textContent = initials;
    }
  }

  const tAvatar = document.getElementById('topbarAvatarInitial');
  if (tAvatar) {
    if (u.foto) {
      tAvatar.innerHTML = `<img src="${u.foto}" alt="${u.nama}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" />`;
    } else {
      tAvatar.textContent = initials;
    }
  }
}

function checkProfileCompletion(u) {
  if (!u) return { complete: false, missing: ['Data Profil'] };
  const missing = [];
  if (!u.nama || !u.nama.trim()) missing.push('Nama Lengkap');
  if (!u.noHp && !u.nohp) missing.push('Nomor WhatsApp / HP');
  if (!u.tglLahir && !u.tgllahir) missing.push('Tanggal Lahir');
  if (!u.alamat || !u.alamat.trim()) missing.push('Alamat Lengkap Domisili');

  const rawEmergency = u.kontakDarurat || u.kontakdarurat || '';
  if (!rawEmergency || !rawEmergency.trim() || rawEmergency === '-') {
    missing.push('Kontak Darurat');
  }
  return {
    complete: missing.length === 0,
    missing: missing
  };
}

function updateAttendanceGatekeeper() {
  const warningEl = document.getElementById('gatekeeperAttendanceWarning');
  const missingListEl = document.getElementById('gatekeeperMissingList');
  const btnIn = document.getElementById('btnCheckIn');
  const btnOut = document.getElementById('btnCheckOut');

  if (!state.currentUser) return;
  if (state.currentUser.role === 'admin') {
    if (warningEl) warningEl.classList.add('hidden');
    if (btnIn) { btnIn.disabled = false; btnIn.style.opacity = '1'; btnIn.style.cursor = 'pointer'; }
    if (btnOut) { btnOut.disabled = false; btnOut.style.opacity = '1'; btnOut.style.cursor = 'pointer'; }
    return;
  }

  const check = checkProfileCompletion(state.currentUser);
  if (!check.complete) {
    if (warningEl) warningEl.classList.remove('hidden');
    if (missingListEl) {
      missingListEl.innerHTML = `⚠️ Kolom wajib belum diisi: <u>${check.missing.join(', ')}</u>`;
    }
    if (btnIn) {
      btnIn.disabled = true;
      btnIn.title = 'Lengkapi Data Diri terlebih dahulu untuk membuka akses presensi';
      btnIn.style.opacity = '0.4';
      btnIn.style.cursor = 'not-allowed';
    }
    if (btnOut) {
      btnOut.disabled = true;
      btnOut.title = 'Lengkapi Data Diri terlebih dahulu untuk membuka akses presensi';
      btnOut.style.opacity = '0.4';
      btnOut.style.cursor = 'not-allowed';
    }
  } else {
    if (warningEl) warningEl.classList.add('hidden');
    if (btnIn) {
      btnIn.disabled = false;
      btnIn.title = '';
      btnIn.style.opacity = '1';
      btnIn.style.cursor = 'pointer';
    }
    if (btnOut) {
      btnOut.disabled = false;
      btnOut.title = '';
      btnOut.style.opacity = '1';
      btnOut.style.cursor = 'pointer';
    }
  }
}

// ================= PHOTO VIEWER LIGHTBOX =================
window.openPhotoViewer = function(user) {
  if (!user) user = state.currentUser;
  if (!user) return;

  const modal = document.getElementById('modalPhotoViewer');
  const img = document.getElementById('photoViewerImg');
  const initials = document.getElementById('photoViewerInitials');
  const nameEl = document.getElementById('photoViewerName');
  const nikEl = document.getElementById('photoViewerNik');

  if (nameEl) nameEl.textContent = user.nama || 'Karyawan';
  if (nikEl) nikEl.textContent = `NIK: ${user.nik} • ${user.divisi || 'Warehouse'}`;

  if (user.foto) {
    if (img) {
      img.src = user.foto;
      img.style.display = 'block';
    }
    if (initials) initials.style.display = 'none';
  } else {
    if (img) img.style.display = 'none';
    if (initials) {
      initials.textContent = (user.nama || 'WH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      initials.style.display = 'block';
    }
  }

  if (modal) modal.classList.remove('hidden');
};

window.openPhotoViewerByNik = function(nik) {
  const u = (state.users || []).find(x => String(x.nik).trim() === String(nik).trim());
  if (u) openPhotoViewer(u);
};

// ================= PROFIL TAB & PENGAJUAN PERUBAHAN =================
function renderUserProfileTab() {
  if (!state.currentUser) return;
  const u = state.currentUser;

  // 1. Header Profile Box & Avatar
  const initials = (u.nama || 'WH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatarImg = document.getElementById('profileBigAvatarImg');
  const avatarText = document.getElementById('profileBigAvatarText');
  if (avatarImg && avatarText) {
    if (u.foto) {
      avatarImg.src = u.foto;
      avatarImg.style.display = 'block';
      avatarText.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarText.textContent = initials;
      avatarText.style.display = 'inline-block';
    }
  }

  updateUserInterfaceAvatars();

  const dName = document.getElementById('profileDisplayName');
  if (dName) dName.textContent = u.nama || 'Pengguna';

  const dNik = document.getElementById('profileDisplayNik');
  if (dNik) dNik.textContent = u.nik || '-';

  const dDiv = document.getElementById('profileDisplayDivisi');
  if (dDiv) dDiv.textContent = u.divisi || 'Warehouse';

  const joinDate = u.tglBergabung || u.tgl_bergabung || '';
  const dJoin = document.getElementById('profileDisplayJoinDate');
  if (dJoin) dJoin.textContent = joinDate || '-';

  const dTenure = document.getElementById('profileDisplayTenure');
  if (dTenure) dTenure.textContent = calculateTenure(joinDate);

  const dPhone = document.getElementById('profileDisplayPhone');
  if (dPhone) dPhone.textContent = u.noHp || u.nohp || '-';

  const dEmail = document.getElementById('profileDisplayEmail');
  if (dEmail) dEmail.textContent = u.email || '-';

  const roleBadge = document.getElementById('profileRoleBadge');
  if (roleBadge) roleBadge.textContent = u.role === 'admin' ? 'Administrator' : (u.divisi || 'Staff Warehouse');

  // 2. Kalkulasi KPI
  const periodSel = document.getElementById('profileKpiPeriodSelect');
  const period = periodSel ? periodSel.value : 'thisMonth';
  const kpi = calculateKPI(u.nik, period) || {
    totalScore: 0, grade: 'A', gradeClass: 'badge-kpi-grade-a',
    gradeTitle: 'Memuat...', gradeDesc: '-',
    attendanceRate: 0, punctualityRate: 0, checkoutCompliance: 0, leaveIndex: 0,
    totalHadir: 0, tepatWaktu: 0, terlambatCount: 0, totalMenitTerlambat: 0,
    totalJamLembur: 0, totalHariCuti: 0, reviewNote: '-'
  };

  const kpiBadge = document.getElementById('profileKpiGradeBadge');
  if (kpiBadge) {
    kpiBadge.className = `badge-kpi-grade ${kpi.gradeClass}`;
    kpiBadge.textContent = `Grade ${kpi.grade} (${kpi.totalScore}%)`;
  }

  const scoreVal = document.getElementById('profileKpiTotalScore');
  if (scoreVal) scoreVal.textContent = `${kpi.totalScore}%`;

  const gradeTitle = document.getElementById('profileKpiGradeTitle');
  if (gradeTitle) gradeTitle.textContent = kpi.gradeTitle;

  const gradeDesc = document.getElementById('profileKpiGradeDesc');
  if (gradeDesc) gradeDesc.textContent = kpi.gradeDesc;

  // 4 Pilar Progress Bars
  const p1Val = document.getElementById('kpiPillarAttendanceVal');
  const p1Bar = document.getElementById('kpiPillarAttendanceBar');
  if (p1Val) p1Val.textContent = `${kpi.attendanceRate}%`;
  if (p1Bar) p1Bar.style.width = `${kpi.attendanceRate}%`;

  const p2Val = document.getElementById('kpiPillarPunctualityVal');
  const p2Bar = document.getElementById('kpiPillarPunctualityBar');
  if (p2Val) p2Val.textContent = `${kpi.punctualityRate}%`;
  if (p2Bar) p2Bar.style.width = `${kpi.punctualityRate}%`;

  const p3Val = document.getElementById('kpiPillarCheckoutVal');
  const p3Bar = document.getElementById('kpiPillarCheckoutBar');
  if (p3Val) p3Val.textContent = `${kpi.checkoutCompliance}%`;
  if (p3Bar) p3Bar.style.width = `${kpi.checkoutCompliance}%`;

  const p4Val = document.getElementById('kpiPillarLeaveVal');
  const p4Bar = document.getElementById('kpiPillarLeaveBar');
  if (p4Val) p4Val.textContent = `${kpi.leaveIndex}%`;
  if (p4Bar) p4Bar.style.width = `${kpi.leaveIndex}%`;

  // Statistik Ringkasan
  const stHadir = document.getElementById('kpiStatTotalHari');
  if (stHadir) stHadir.textContent = `${kpi.totalHadir} Hari`;

  const stTepat = document.getElementById('kpiStatTepatWaktu');
  if (stTepat) stTepat.textContent = `${kpi.tepatWaktu} Hari`;

  const stTelat = document.getElementById('kpiStatTerlambat');
  if (stTelat) stTelat.textContent = `${kpi.terlambatCount} Hari (${kpi.totalMenitTerlambat} mnt)`;

  const stLembur = document.getElementById('kpiStatTotalLembur');
  if (stLembur) stLembur.textContent = `${kpi.totalJamLembur} Jam`;

  const stCuti = document.getElementById('kpiStatTotalCuti');
  if (stCuti) stCuti.textContent = `${kpi.totalHariCuti} Hari`;

  const revBox = document.getElementById('profileKpiReviewBox');
  if (revBox) revBox.innerHTML = `💡 ${kpi.reviewNote}`;

  // 3. Mengisi Form Biodata
  const fNik = document.getElementById('profNik');
  if (fNik) fNik.value = u.nik || '';

  const fNama = document.getElementById('profNama');
  if (fNama) fNama.value = u.nama || '';

  const fDiv = document.getElementById('profDivisi');
  if (fDiv) fDiv.value = u.divisi || 'Warehouse';

  const fRole = document.getElementById('profRole');
  if (fRole) fRole.value = u.role === 'admin' ? 'Administrator' : 'Karyawan / User';

  const fJoin = document.getElementById('profTglBergabung');
  if (fJoin) fJoin.value = u.tglBergabung || u.tgl_bergabung || '';

  const fNoHp = document.getElementById('profNoHp');
  if (fNoHp) fNoHp.value = u.noHp || u.nohp || '';

  const fEmail = document.getElementById('profEmail');
  if (fEmail) fEmail.value = u.email || '';

  const fTglLahir = document.getElementById('profTglLahir');
  if (fTglLahir) fTglLahir.value = u.tglLahir || u.tgllahir || '';

  const fHobi = document.getElementById('profHobi');
  if (fHobi) fHobi.value = u.hobi || '';

  const fAlamat = document.getElementById('profAlamat');
  if (fAlamat) fAlamat.value = u.alamat || '';

  // Kontak Darurat
  const fEmNama = document.getElementById('profEmergencyNama');
  const fEmHub = document.getElementById('profEmergencyHubungan');
  const fEmPhone = document.getElementById('profEmergencyPhone');

  const rawEmergency = u.kontakDarurat || u.kontakdarurat || '';
  if (rawEmergency.includes(' - ')) {
    const parts = rawEmergency.split(' - ');
    if (fEmNama) fEmNama.value = parts[0] || '';
    if (fEmHub) fEmHub.value = parts[1] || 'Orang Tua';
    if (fEmPhone) fEmPhone.value = parts[2] || '';
  } else {
    if (fEmNama) fEmNama.value = rawEmergency;
    if (fEmPhone) fEmPhone.value = '';
  }

  // 4. Status Kunci / Gatekeeper Evaluation
  const check = checkProfileCompletion(u);
  const bannerEl = document.getElementById('profileStatusBanner');
  const btnSave = document.getElementById('btnSaveProfile');
  const btnRequest = document.getElementById('btnOpenRequestChange');
  const inputsToControl = [fNama, fNoHp, fEmail, fTglLahir, fHobi, fAlamat, fEmNama, fEmHub, fEmPhone, fJoin];

  const pendingReq = (state.profileRequests || []).find(r => String(r.nik).trim() === String(u.nik).trim() && r.status === 'Diajukan');

  if (u.role === 'admin') {
    // Mode Administrator: Bebas edit kapan saja
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="profile-locked-banner" style="background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.3);">
          <span>👑 <strong>Mode Administrator:</strong> Anda memiliki akses bebas untuk mengedit data diri profil kapan saja.</span>
        </div>
      `;
    }
    inputsToControl.forEach(inp => { if (inp) inp.disabled = false; });
    if (btnSave) btnSave.classList.remove('hidden');
    if (btnRequest) btnRequest.classList.add('hidden');
  } else if (!check.complete) {
    // Mode Karyawan: Belum lengkap -> Wajib lengkapi & simpan
    if (bannerEl) {
      bannerEl.innerHTML = `
        <div class="gatekeeper-warning-box" style="padding: 14px 16px; margin-bottom: 0;">
          <div style="font-weight: 700; color: #b45309; margin-bottom: 4px;">⚠️ Data Diri Anda Belum Lengkap!</div>
          <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.4;">
            Mohon lengkapi semua kolom bertanda bintang (<span class="badge-required-star">*</span>) lalu klik tombol <strong>"💾 Simpan & Kunci Data Diri"</strong> di bawah untuk membuka akses presensi kehadiran.
          </div>
          <div style="font-size: 0.8rem; color: #d97706; font-weight: 600; margin-top: 6px;">
            Kolom yang masih kosong: <u>${check.missing.join(', ')}</u>
          </div>
        </div>
      `;
    }
    inputsToControl.forEach(inp => { if (inp) inp.disabled = false; });
    if (btnSave) {
      btnSave.classList.remove('hidden');
      btnSave.querySelector('.btn-text').textContent = '💾 Simpan & Kunci Data Diri';
    }
    if (btnRequest) btnRequest.classList.add('hidden');
  } else {
    // Mode Karyawan: Sudah lengkap -> Terkunci (Read-Only)
    if (pendingReq) {
      if (bannerEl) {
        bannerEl.innerHTML = `
          <div class="profile-pending-banner">
            <div>
              <span style="font-weight: 700; color: var(--accent, #6366f1);">⏳ Pengajuan Perubahan Data Sedang Ditinjau Admin</span><br>
              <small style="color: var(--text-muted);">Diajukan pada ${pendingReq.tanggal || '-'}. Alasan: "${escapeHtml(pendingReq.alasan || '-')}"</small>
            </div>
            <span class="status diajukan">Menunggu Approval</span>
          </div>
        `;
      }
    } else {
      if (bannerEl) {
        bannerEl.innerHTML = `
          <div class="profile-locked-banner">
            <div>
              <span style="font-weight: 700; color: var(--success, #10b981);">🔒 Data Diri Terverifikasi & Terkunci</span><br>
              <small style="color: var(--text-muted);">Data diri Anda telah lengkap. Untuk menjaga keaslian data, perubahan data wajib melalui persetujuan Admin.</small>
            </div>
            <button type="button" class="primary-btn small-btn" onclick="openRequestProfileChangeModal()" style="font-size: 0.8rem; padding: 6px 14px;">
              📝 Ajukan Perubahan
            </button>
          </div>
        `;
      }
    }

    // Kunci semua input agar tidak sembarangan diubah
    inputsToControl.forEach(inp => { if (inp) inp.disabled = true; });
    if (btnSave) btnSave.classList.add('hidden');
    if (btnRequest) btnRequest.classList.remove('hidden');
  }

  updateAttendanceGatekeeper();
}

async function saveUserProfile(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('btnSaveProfile');
  const msg = document.getElementById('profileFormMessage');
  if (msg) msg.textContent = '';
  setButtonLoading(btn, true, 'Menyimpan & Mengunci Data...');

  const emNama = (document.getElementById('profEmergencyNama')?.value || '').trim();
  const emHub = (document.getElementById('profEmergencyHubungan')?.value || '').trim();
  const emPhone = (document.getElementById('profEmergencyPhone')?.value || '').trim();

  let kontakDaruratStr = '';
  if (emNama) {
    kontakDaruratStr = [emNama, emHub, emPhone].filter(Boolean).join(' - ');
  }

  const payload = {
    nik: state.currentUser.nik,
    nama: (document.getElementById('profNama')?.value || '').trim(),
    tglBergabung: (document.getElementById('profTglBergabung')?.value || '').trim(),
    noHp: (document.getElementById('profNoHp')?.value || '').trim(),
    email: (document.getElementById('profEmail')?.value || '').trim(),
    tglLahir: (document.getElementById('profTglLahir')?.value || '').trim(),
    hobi: (document.getElementById('profHobi')?.value || '').trim(),
    alamat: (document.getElementById('profAlamat')?.value || '').trim(),
    kontakDarurat: kontakDaruratStr
  };

  try {
    const res = await apiRequest('saveUserProfile', payload);
    setButtonLoading(btn, false);

    if (res && res.success) {
      // Update state.currentUser
      Object.assign(state.currentUser, payload);
      localStorage.setItem('currentUser', JSON.stringify(state.currentUser));

      // Update state.users list
      const userInList = (state.users || []).find(x => x.nik === state.currentUser.nik);
      if (userInList) Object.assign(userInList, payload);

      showToast('🎉 Data diri berhasil disimpan & akses presensi aktif!');
      if (msg) {
        msg.textContent = '✅ Data diri Anda berhasil disimpan & terkunci di sistem.';
        msg.style.color = 'var(--success, #10b981)';
      }
      renderUserProfileTab();
      updateAttendanceGatekeeper();
      if (state.currentUser.role === 'admin') renderUserTable();
    } else {
      throw new Error(res ? res.message : 'Gagal menyimpan');
    }
  } catch (err) {
    setButtonLoading(btn, false);
    showToast('Gagal menyimpan profil: ' + err.message, 'error');
    if (msg) {
      msg.textContent = '❌ Gagal menyimpan data: ' + err.message;
      msg.style.color = 'var(--error, #ef4444)';
    }
  }
}

// ================= PENGAJUAN PERUBAHAN PROFIL (KARYAWAN) =================
window.openRequestProfileChangeModal = function() {
  const u = state.currentUser;
  if (!u) return;

  const fNama = document.getElementById('reqNama');
  const fNoHp = document.getElementById('reqNoHp');
  const fEmail = document.getElementById('reqEmail');
  const fTglLahir = document.getElementById('reqTglLahir');
  const fAlamat = document.getElementById('reqAlamat');
  const fHobi = document.getElementById('reqHobi');
  const fAlasan = document.getElementById('reqAlasan');

  if (fNama) fNama.value = u.nama || '';
  if (fNoHp) fNoHp.value = u.noHp || u.nohp || '';
  if (fEmail) fEmail.value = u.email || '';
  if (fTglLahir) fTglLahir.value = u.tglLahir || u.tgllahir || '';
  if (fAlamat) fAlamat.value = u.alamat || '';
  if (fHobi) fHobi.value = u.hobi || '';
  if (fAlasan) fAlasan.value = '';

  const fEmNama = document.getElementById('reqEmergencyNama');
  const fEmHub = document.getElementById('reqEmergencyHubungan');
  const fEmPhone = document.getElementById('reqEmergencyPhone');

  const rawEmergency = u.kontakDarurat || u.kontakdarurat || '';
  if (rawEmergency.includes(' - ')) {
    const parts = rawEmergency.split(' - ');
    if (fEmNama) fEmNama.value = parts[0] || '';
    if (fEmHub) fEmHub.value = parts[1] || 'Orang Tua';
    if (fEmPhone) fEmPhone.value = parts[2] || '';
  } else {
    if (fEmNama) fEmNama.value = rawEmergency;
    if (fEmPhone) fEmPhone.value = '';
  }

  const modal = document.getElementById('modalAjukanPerubahanProfil');
  if (modal) modal.classList.remove('hidden');
};

async function submitProfileChangeRequest(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('btnSubmitProfileRequest');
  setButtonLoading(btn, true, 'Mengirim Pengajuan...');

  const emNama = (document.getElementById('reqEmergencyNama')?.value || '').trim();
  const emHub = (document.getElementById('reqEmergencyHubungan')?.value || '').trim();
  const emPhone = (document.getElementById('reqEmergencyPhone')?.value || '').trim();
  const kontakDaruratStr = [emNama, emHub, emPhone].filter(Boolean).join(' - ');

  const reqData = {
    id: 'REQ-' + Date.now(),
    nik: state.currentUser.nik,
    namaLama: state.currentUser.nama,
    namaBaru: (document.getElementById('reqNama')?.value || '').trim(),
    noHpBaru: (document.getElementById('reqNoHp')?.value || '').trim(),
    emailBaru: (document.getElementById('reqEmail')?.value || '').trim(),
    tglLahirBaru: (document.getElementById('reqTglLahir')?.value || '').trim(),
    alamatBaru: (document.getElementById('reqAlamat')?.value || '').trim(),
    hobiBaru: (document.getElementById('reqHobi')?.value || '').trim(),
    kontakDaruratBaru: kontakDaruratStr,
    alasan: (document.getElementById('reqAlasan')?.value || '').trim(),
    status: 'Diajukan',
    tanggal: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  try {
    const res = await apiRequest('submitProfileChangeRequest', reqData);
    setButtonLoading(btn, false);

    if (res && res.success) {
      if (!state.profileRequests) state.profileRequests = [];
      state.profileRequests.unshift(reqData);
      closeModal('modalAjukanPerubahanProfil');
      showToast('✅ Pengajuan perubahan profil berhasil dikirim ke Admin!');
      renderUserProfileTab();
      if (state.currentUser.role === 'admin') renderAdminProfileRequestsTable();
    } else {
      throw new Error(res ? res.message : 'Gagal mengirim pengajuan');
    }
  } catch (err) {
    setButtonLoading(btn, false);
    showToast('Gagal mengajukan perubahan profil: ' + err.message, 'error');
  }
}

// ================= ADMIN PROFILE REQUESTS TABLE & APPROVAL =================
async function loadProfileRequests() {
  const res = await apiRequest('getProfileRequests');
  if (res && res.data) {
    state.profileRequests = res.data || [];
    if (state.currentUser && state.currentUser.role === 'admin') {
      renderAdminProfileRequestsTable();
    }
  }
}

function renderAdminProfileRequestsTable() {
  const wrap = document.getElementById('adminProfileRequestsTableWrap');
  const badge = document.getElementById('badgePendingProfileRequestsCount');
  if (!wrap) return;

  const requests = (state.profileRequests || []).filter(r => r.status === 'Diajukan');
  if (badge) {
    if (requests.length > 0) {
      badge.textContent = `${requests.length} Pengajuan Menunggu`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  if (!requests.length) {
    wrap.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted);">Tidak ada pengajuan perubahan profil yang menunggu persetujuan.</div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Karyawan (NIK)</th>
          <th>Perubahan yang Diajukan</th>
          <th>Alasan Karyawan</th>
          <th>Status</th>
          <th>Aksi Verifikasi</th>
        </tr>
      </thead>
      <tbody>
        ${requests.map(r => `
          <tr>
            <td><span class="mono-text">${r.tanggal || '-'}</span></td>
            <td>
              <strong>${escapeHtml(r.namaLama || r.namaBaru)}</strong><br>
              <small class="mono-text">${r.nik}</small>
            </td>
            <td>
              <div style="font-size: 0.8rem; line-height: 1.45;">
                ${r.namaBaru !== r.namaLama ? `<div>👤 <strong>Nama Baru:</strong> ${escapeHtml(r.namaBaru)}</div>` : ''}
                <div>📱 <strong>WhatsApp:</strong> ${escapeHtml(r.noHpBaru)}</div>
                ${r.emailBaru ? `<div>✉️ <strong>Email:</strong> ${escapeHtml(r.emailBaru)}</div>` : ''}
                ${r.tglLahirBaru ? `<div>🎂 <strong>Tgl Lahir:</strong> ${r.tglLahirBaru}</div>` : ''}
                <div>🏠 <strong>Alamat:</strong> ${escapeHtml(r.alamatBaru)}</div>
                <div>🚨 <strong>Kontak Darurat:</strong> ${escapeHtml(r.kontakDaruratBaru)}</div>
              </div>
            </td>
            <td><em>"${escapeHtml(r.alasan || '-')}"</em></td>
            <td><span class="status diajukan">${r.status}</span></td>
            <td class="action-cell">
              <div class="action-btn-group">
                <button type="button" class="action-btn" style="background: var(--success, #10b981); color:#fff;" onclick="approveProfileChangeRequest('${r.id}')">✅ Setujui</button>
                <button type="button" class="action-btn delete" onclick="rejectProfileChangeRequest('${r.id}')">❌ Tolak</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

window.approveProfileChangeRequest = async function(reqId) {
  const req = (state.profileRequests || []).find(r => r.id === reqId);
  if (!req) return;

  if (!confirm(`Setujui pembaruan profil untuk ${req.namaLama || req.nik}? Data profil karyawan akan langsung diperbarui.`)) return;

  try {
    const res = await apiRequest('approveProfileChangeRequest', { id: reqId, nik: req.nik, approvedData: req });
    if (res && res.success) {
      req.status = 'Disetujui';

      // Update state.users
      const u = (state.users || []).find(x => x.nik === req.nik);
      if (u) {
        u.nama = req.namaBaru;
        u.noHp = req.noHpBaru;
        u.email = req.emailBaru;
        u.tglLahir = req.tglLahirBaru;
        u.alamat = req.alamatBaru;
        u.hobi = req.hobiBaru;
        u.kontakDarurat = req.kontakDaruratBaru;
      }

      if (state.currentUser && state.currentUser.nik === req.nik) {
        Object.assign(state.currentUser, {
          nama: req.namaBaru, noHp: req.noHpBaru, email: req.emailBaru,
          tglLahir: req.tglLahirBaru, alamat: req.alamatBaru, hobi: req.hobiBaru,
          kontakDarurat: req.kontakDaruratBaru
        });
        localStorage.setItem('currentUser', JSON.stringify(state.currentUser));
      }

      showToast('✅ Pengajuan perubahan profil disetujui & data karyawan diperbarui!');
      renderAdminProfileRequestsTable();
      renderUserTable();
    } else {
      throw new Error(res ? res.message : 'Gagal menyetujui');
    }
  } catch (err) {
    showToast('Gagal menyetujui: ' + err.message, 'error');
  }
};

window.rejectProfileChangeRequest = async function(reqId) {
  const req = (state.profileRequests || []).find(r => r.id === reqId);
  if (!req) return;

  const reason = prompt('Masukkan alasan penolakan pengajuan profil:');
  if (reason === null) return;

  try {
    const res = await apiRequest('rejectProfileChangeRequest', { id: reqId, nik: req.nik, alasanTolak: reason });
    if (res && res.success) {
      req.status = 'Ditolak';
      req.alasanTolak = reason;
      showToast('❌ Pengajuan perubahan profil ditolak.');
      renderAdminProfileRequestsTable();
    } else {
      throw new Error(res ? res.message : 'Gagal menolak');
    }
  } catch (err) {
    showToast('Gagal menolak: ' + err.message, 'error');
  }
};

// Modal Admin untuk Melihat Detail KPI & Profil Staf
window.openUserKpiDetail = function(nik, period = 'thisMonth') {
  const u = (state.users || []).find(x => String(x.nik).trim() === String(nik).trim());
  if (!u) return showToast('Data karyawan tidak ditemukan', 'error');

  const kpi = calculateKPI(nik, period) || {
    totalScore: 0, grade: 'A', gradeClass: 'badge-kpi-grade-a',
    gradeTitle: 'Memuat...', gradeDesc: '-',
    attendanceRate: 0, punctualityRate: 0, checkoutCompliance: 0, leaveIndex: 0,
    totalHadir: 0, tepatWaktu: 0, terlambatCount: 0, totalMenitTerlambat: 0,
    totalJamLembur: 0, totalHariCuti: 0, reviewNote: '-'
  };

  const initials = (u.nama || 'WH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const tenure = calculateTenure(u.tglBergabung || u.tgl_bergabung);
  const avatarHtml = u.foto ? 
    `<div style="width: 64px; height: 64px; border-radius: 50%; overflow: hidden; flex-shrink: 0; border: 2px solid var(--accent, #6366f1);"><img src="${u.foto}" alt="${u.nama}" style="width:100%; height:100%; object-fit:cover;" /></div>` :
    `<div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; flex-shrink: 0;">${initials}</div>`;

  const bodyEl = document.getElementById('modalDetailKpiUserBody');
  if (!bodyEl) return;

  bodyEl.innerHTML = `
    <!-- PROFILE HEADER IN MODAL -->
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle);">
      ${avatarHtml}
      <div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <h3 style="margin: 0;">${escapeHtml(u.nama)}</h3>
          <span class="badge-role">${escapeHtml(u.divisi || 'Warehouse')}</span>
          <span class="badge-kpi-grade ${kpi.gradeClass}">Grade ${kpi.grade} (${kpi.totalScore}%)</span>
        </div>
        <div style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px 12px;">
          <span>🆔 NIK: <strong>${u.nik}</strong></span> • 
          <span>📅 Masuk: <strong>${u.tglBergabung || u.tgl_bergabung || '-'}</strong> (${tenure})</span> • 
          <span>📱 WhatsApp: <strong>${u.noHp || '-'}</strong></span> • 
          <span>✉️ Email: <strong>${u.email || '-'}</strong></span>
        </div>
      </div>
    </div>

    <!-- FILTER PERIODE MODAL -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <h4 style="margin: 0;">📊 Evaluasi Performa Kehadiran</h4>
      <select onchange="openUserKpiDetail('${nik}', this.value)" style="padding: 4px 10px; font-size: 0.82rem; border-radius: 6px;">
        <option value="thisMonth" ${period === 'thisMonth' ? 'selected' : ''}>Bulan Ini</option>
        <option value="lastMonth" ${period === 'lastMonth' ? 'selected' : ''}>Bulan Lalu</option>
        <option value="last3Months" ${period === 'last3Months' ? 'selected' : ''}>3 Bulan Terakhir</option>
        <option value="all" ${period === 'all' ? 'selected' : ''}>Semua Data</option>
      </select>
    </div>

    <!-- KPI HERO GRID -->
    <div class="kpi-hero-grid" style="margin-bottom: 16px;">
      <div class="kpi-score-card">
        <div class="kpi-score-circle">
          <span class="kpi-score-val">${kpi.totalScore}%</span>
          <span class="kpi-score-lbl">Skor KPI</span>
        </div>
        <div class="kpi-grade-summary">
          <div class="kpi-grade-title">${kpi.gradeTitle}</div>
          <div class="kpi-grade-desc">${kpi.gradeDesc}</div>
        </div>
      </div>

      <div class="kpi-pillars-box">
        <div class="kpi-pillar-row">
          <div class="kpi-pillar-head">
            <span>1. Tingkat Kehadiran (40%)</span>
            <strong>${kpi.attendanceRate}%</strong>
          </div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill fill-green" style="width: ${kpi.attendanceRate}%;"></div>
          </div>
        </div>
        <div class="kpi-pillar-row">
          <div class="kpi-pillar-head">
            <span>2. Ketepatan Waktu Masuk (35%)</span>
            <strong>${kpi.punctualityRate}%</strong>
          </div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill fill-blue" style="width: ${kpi.punctualityRate}%;"></div>
          </div>
        </div>
        <div class="kpi-pillar-row">
          <div class="kpi-pillar-head">
            <span>3. Kepatuhan Checkout Pulang (15%)</span>
            <strong>${kpi.checkoutCompliance}%</strong>
          </div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill fill-purple" style="width: ${kpi.checkoutCompliance}%;"></div>
          </div>
        </div>
        <div class="kpi-pillar-row">
          <div class="kpi-pillar-head">
            <span>4. Indeks Cuti / Izin Terencana (10%)</span>
            <strong>${kpi.leaveIndex}%</strong>
          </div>
          <div class="kpi-progress-bar">
            <div class="kpi-progress-fill fill-amber" style="width: ${kpi.leaveIndex}%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- STATISTIK GRID -->
    <div class="kpi-stats-grid" style="margin-bottom: 16px;">
      <div class="kpi-stat-item">
        <span class="kpi-stat-icon">📅</span>
        <div>
          <div class="kpi-stat-val">${kpi.totalHadir} Hari</div>
          <div class="kpi-stat-label">Total Hadir</div>
        </div>
      </div>
      <div class="kpi-stat-item">
        <span class="kpi-stat-icon">⏰</span>
        <div>
          <div class="kpi-stat-val" style="color: var(--success, #10b981);">${kpi.tepatWaktu} Hari</div>
          <div class="kpi-stat-label">Tepat Waktu</div>
        </div>
      </div>
      <div class="kpi-stat-item">
        <span class="kpi-stat-icon">⚠️</span>
        <div>
          <div class="kpi-stat-val" style="color: var(--error, #ef4444);">${kpi.terlambatCount} Hari (${kpi.totalMenitTerlambat}m)</div>
          <div class="kpi-stat-label">Terlambat</div>
        </div>
      </div>
      <div class="kpi-stat-item">
        <span class="kpi-stat-icon">⚡</span>
        <div>
          <div class="kpi-stat-val">${kpi.totalJamLembur} Jam</div>
          <div class="kpi-stat-label">Lembur Disetujui</div>
        </div>
      </div>
    </div>

    <div class="kpi-review-note" style="margin-bottom: 20px;">
      💡 ${kpi.reviewNote}
    </div>

    <!-- BIODATA LENGKAP STAF -->
    <div style="background: var(--bg-app); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px 18px;">
      <h4 style="margin: 0 0 10px 0;">📋 Informasi Biodata & Kontak Darurat</h4>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.85rem;">
        <div><strong>Alamat Domisili:</strong><br><span style="color: var(--text-muted);">${escapeHtml(u.alamat || '-')}</span></div>
        <div><strong>Tanggal Lahir:</strong><br><span style="color: var(--text-muted);">${u.tglLahir || '-'}</span></div>
        <div><strong>Hobi / Minat:</strong><br><span style="color: var(--text-muted);">${escapeHtml(u.hobi || '-')}</span></div>
        <div><strong>Kontak Darurat:</strong><br><span style="color: var(--text-muted);">${escapeHtml(u.kontakDarurat || '-')}</span></div>
      </div>
    </div>

    <div class="submit-row" style="margin-top: 18px; justify-content: flex-end;">
      <button type="button" class="secondary-btn" onclick="closeModal('modalDetailKpiUser')">Tutup</button>
    </div>
  `;

  openModal('modalDetailKpiUser');
};

window.calculateKPI = calculateKPI;
window.renderUserProfileTab = renderUserProfileTab;
window.saveUserProfile = saveUserProfile;

// ================= TAB NAVIGATION BINDINGS =================

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

// ================= AUTH EVENTS =================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
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
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser'); 
    location.reload();
  });
}

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
// ================= EDIT ROSTER MODAL =================

window.openAddRosterModal = function(nik, nama, date) {
  document.getElementById('editRosterId').value = '';
  document.getElementById('editRosterId').dataset.nik = nik;
  document.getElementById('editRosterNama').value = nama + ' (' + nik + ')';
  document.getElementById('editRosterTanggal').value = date;
  document.getElementById('editRosterShift').value = 'Shift 1';
  document.getElementById('editRosterJamMasuk').value = '08:00';
  document.getElementById('editRosterJamPulang').value = '17:00';
  document.getElementById('editRosterKeterangan').value = '';
  document.getElementById('modalEditRoster').querySelector('.panel-header-row h3').innerText = 'Tambah Roster Shift';
  const btnDel = document.getElementById('btnDeleteRoster');
  if (btnDel) btnDel.style.display = 'none';
  openModal('modalEditRoster');
};

window.openEditRosterModal = function(id) {
  const r = state.roster.find(x => String(x.id) === String(id));
  if (!r) return;
  document.getElementById('editRosterId').value = r.id;
  document.getElementById('editRosterNama').value = r.nama + ' (' + r.nik + ')';
  document.getElementById('editRosterTanggal').value = r.tanggal;
  document.getElementById('editRosterShift').value = r.shift;
  document.getElementById('editRosterJamMasuk').value = r.jamMasuk;
  document.getElementById('editRosterJamPulang').value = r.jamPulang;
  document.getElementById('editRosterKeterangan').value = r.keterangan || '';
  document.getElementById('modalEditRoster').querySelector('.panel-header-row h3').innerText = 'Edit Roster Shift';
  const btnDel = document.getElementById('btnDeleteRoster');
  if (btnDel) btnDel.style.display = 'inline-block';
  openModal('modalEditRoster');
};

window.autoFillEditJam = function() {
  const shift = document.getElementById('editRosterShift').value;
  let jamMasuk = '', jamPulang = '';
  if (shift === 'Shift 1') { jamMasuk = '08:00'; jamPulang = '17:00'; }
  else if (shift === 'Shift 2') { jamMasuk = '09:00'; jamPulang = '18:00'; }
  else if (shift === 'Shift 3') { jamMasuk = '12:00'; jamPulang = '21:00'; }
  
  if(jamMasuk) document.getElementById('editRosterJamMasuk').value = jamMasuk;
  if(jamPulang) document.getElementById('editRosterJamPulang').value = jamPulang;
};

window.deleteRosterFromModal = async function() {
  const id = document.getElementById('editRosterId').value;
  if (!id) return;
  if (!confirm('Apakah Anda yakin ingin menghapus jadwal shift ini?')) return;
  
  showLoading();
  try {
    const res = await apiRequest('deleteRosterShift', { id });
    if (!res || !res.success) throw new Error(res ? res.message : 'Unknown error');
    alert('Jadwal berhasil dihapus!');
    closeModal('modalEditRoster');
    await loadRosterShifts();
    renderAdminRosterTable();
  } catch (err) {
    alert('Gagal menghapus jadwal: ' + err.message);
  } finally {
    hideLoading();
  }
};

window.saveEditRoster = async function(e) {
  e.preventDefault();
  const id = document.getElementById('editRosterId').value;
  const tanggal = document.getElementById('editRosterTanggal').value;
  const shift = document.getElementById('editRosterShift').value;
  const jamMasuk = document.getElementById('editRosterJamMasuk').value;
  const jamPulang = document.getElementById('editRosterJamPulang').value;
  const keterangan = document.getElementById('editRosterKeterangan').value;
  const nik = id ? state.roster.find(x => String(x.id) === String(id)).nik : document.getElementById('editRosterId').dataset.nik;

  showLoading();
  try {
    const rosterList = [{ nik, tanggal, shift, jamMasuk, jamPulang, keterangan }];
    const res = await apiRequest('saveRosterBulk', { rosterList });
    if (!res || !res.success) throw new Error(res ? res.message : 'Unknown error');

    alert('Roster berhasil diupdate!');
    closeModal('modalEditRoster');
    await loadRosterShifts();
    renderAdminRosterTable();
  } catch (err) {
    alert('Gagal update roster: ' + err.message);
  } finally {
    hideLoading();
  }
};
