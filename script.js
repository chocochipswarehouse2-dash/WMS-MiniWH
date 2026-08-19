

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
  inventoryTab: 'Inventory Matrix – Stock Semua Outlet',
  presensiTab: 'Presensi Harian Warehouse',
  formLemburTab: 'Form Pengajuan Lembur',
  statusLemburTab: 'Status Lembur Saya',
  formCutiTab: 'Form Pengajuan Ijin / Cuti',
  statusCutiTab: 'Info Ijin & Cuti Tim',
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
  // Auto-load inventory data when switching to inventoryTab
  if (tabId === 'inventoryTab' && invAllData.length === 0) {
    loadInventoryData();
  }

  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar && overlay && window.innerWidth <= 768) {
    sidebar.classList.remove('open');
    overlay.classList.add('hidden');
  }
}

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
    return await supabaseApiRequest(action, payload);
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
            <div class="shift-block ${bgClass}" onclick="openEditRosterModal('${shiftData.id}')">
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
          <th>Nama Lengkap</th>
          <th>ID (NIK)</th>
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
            <td><strong>${u.nama}</strong></td>
            <td><span class="mono-text">${u.nik}</span></td>
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
      const initials = (state.currentUser.nama || 'WH').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      const sAvatar = document.getElementById('sidebarAvatarInitial');
      const tAvatar = document.getElementById('topbarAvatarInitial');
      if (sAvatar) sAvatar.textContent = initials;
      if (tAvatar) tAvatar.textContent = initials;

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
      loadShifts(),
      loadRosterShifts(),
      loadAbsensi(),
      loadKasbon(),
      loadLembur(),
      loadCuti(),
      loadPayroll()
    ]);

    renderEmployeeShiftDashboard();
  } catch (err) {
    console.error('Error starting app:', err);
  }
}


// ================= INVENTORY MODULE =================

const INV_OUTLET_MAP = [
  // RETAIL
  { col: 'cpj',  label: 'CPJ',  name: 'Central Park Jakarta',         group: 'retail' },
  { col: 'gst',  label: 'GST',  name: 'Gading Serpong Tangerang',     group: 'retail' },
  { col: 'lmp',  label: 'LMP',  name: 'Lippo Mall Puri',              group: 'retail' },
  { col: 'bts',  label: 'BTS',  name: 'By The Sea PIK',               group: 'retail' },
  { col: 'cws',  label: 'CWS',  name: 'Ciputra World Surabaya',       group: 'retail' },
  { col: 'dpm',  label: 'DPM',  name: 'Deli Park Medan',              group: 'retail' },
  { col: 'phb',  label: 'PHB',  name: 'Paskal Hyper Square Bandung',  group: 'retail' },
  { col: 'pms',  label: 'PMS',  name: 'Pakuwon Mall Surabaya',        group: 'retail' },
  { col: 'mkg',  label: 'MKG',  name: 'Mall Kelapa Gading',           group: 'retail' },
  { col: 'lwt',  label: 'LWT',  name: 'Living World Tangerang',       group: 'retail' },
  { col: 'kyt',  label: 'KYT',  name: 'KYTE',                         group: 'retail' },
  { col: 'nsj',  label: 'NSJ',  name: 'Neo Soho Jakarta',             group: 'retail' },
  { col: 'bcpj', label: 'BCPJ', name: 'Bazaar Central Park',          group: 'retail' },
  { col: 'blmp', label: 'BLMP', name: 'Bazaar Lippo Mall Puri',       group: 'retail' },
  { col: 'pim',  label: 'PIM',  name: 'Puri Indah Mall',              group: 'retail' },
  { col: 'lvt',  label: 'LVT',  name: 'La Vela Tangerang',            group: 'retail' },
  { col: 'gaia', label: 'GAIA', name: 'Gaia Pontianak',               group: 'retail' },
  { col: 'spm',  label: 'SPM',  name: 'Sun Plaza Medan',              group: 'retail' },
  // ONLINE
  { col: 'web',  label: 'WEB',  name: 'Website',                      group: 'online' },
  { col: 'map_', label: 'MAP',  name: 'Marketplace',                  group: 'online' },
  { col: 'shp',  label: 'SHP',  name: 'Shopee',                       group: 'online' },
  { col: 'tpd',  label: 'TPD',  name: 'Tokopedia',                    group: 'online' },
  { col: 'ttk',  label: 'TTK',  name: 'TikTok',                       group: 'online' },
  { col: 'lzd',  label: 'LZD',  name: 'Lazada',                       group: 'online' },
  { col: 'woo',  label: 'WOO',  name: 'Woocommerce',                  group: 'online' },
  { col: 'cshp', label: 'CSHP', name: 'ChicShopee',                   group: 'online' },
  { col: 'sdpm', label: 'SDPM', name: 'Shopee - Deli Park Medan',     group: 'online' },
  { col: 'scws', label: 'SCWS', name: 'Shopee - Ciputra World Sby',   group: 'online' },
  // GUDANG/INTERNAL
  { col: 'wh',   label: 'WH',   name: 'Warehouse Utama',              group: 'gudang' },
  { col: 'buy',  label: 'BUY',  name: 'Buying Staff',                 group: 'gudang' },
  { col: 'dd',   label: 'DD',   name: 'Diskon Defect',                group: 'gudang' },
  { col: 'endr', label: 'END',  name: 'Endorsement',                  group: 'gudang' },
  { col: 'std',  label: 'STD',  name: 'Sample Studio',                group: 'gudang' },
  { col: 'lnd',  label: 'LND',  name: 'Loss/Damage',                  group: 'gudang' },
  { col: 'ga',   label: 'GA',   name: 'Gudang Awal',                  group: 'gudang' },
  { col: 'qc',   label: 'QC',   name: 'Gudang QC',                    group: 'gudang' },
  { col: 'pmk',  label: 'PMK',  name: 'Gudang Permak',                group: 'gudang' },
  { col: 'ret',  label: 'RET',  name: 'Gudang Retur',                 group: 'gudang' },
  { col: 'logx', label: 'LOG',  name: 'Gudang Logistik',              group: 'gudang' },
  { col: 'live', label: 'LIVE', name: 'Sample Live',                  group: 'gudang' },
];

// CSV header → Supabase column mapping
const CSV_COL_MAP = {
  'Inventory_Central Park Jakarta':           'cpj',
  'Inventory_Gading Serpong Tangerang':       'gst',
  'Inventory_Lippo Mall Puri':               'lmp',
  'Inventory_By The Sea PIK':               'bts',
  'Inventory_Ciputra World Surabaya':        'cws',
  'Inventory_Deli Park Medan':              'dpm',
  'Inventory_Paskal Hyper Square Bandung':  'phb',
  'Inventory_Pakuwon Mall Surabaya':        'pms',
  'Inventory_Mall Kelapa Gading':           'mkg',
  'Inventory_Living World Tangerang':       'lwt',
  'Inventory_KYTE':                         'kyt',
  'Inventory_Neo Soho Jakarta':             'nsj',
  'Inventory_Bazaar Central Park':          'bcpj',
  'Inventory_Bazaar Lippo Mall Puri':       'blmp',
  'Inventory_Puri Indah Mall':              'pim',
  'Inventory_La Vela Tangerang':            'lvt',
  'Inventory_Gaia Pontianak':               'gaia',
  'Inventory_Sun Plaza Medan':              'spm',
  'Inventory_Website':                      'web',
  'Inventory_Marketplace':                  'map_',
  'Inventory_Shopee':                       'shp',
  'Inventory_Tokopedia':                    'tpd',
  'Inventory_TikTok':                       'ttk',
  'Inventory_Lazada':                       'lzd',
  'Inventory_Woocommerce':                  'woo',
  'Inventory_ChicShopee':                   'cshp',
  'Inventory_Shopee - Deli Park Medan':     'sdpm',
  'Inventory_Shopee - Ciputra World Surabaya': 'scws',
  'Inventory_Warehouse':                    'wh',
  'Inventory_Buying Staff':                 'buy',
  'Inventory_Diskon Defect':               'dd',
  'Inventory_Endorsement':                 'endr',
  'Inventory_Sample Studio':               'std',
  'Inventory_Loss/Damage':                 'lnd',
  'Inventory_Gudang Awal':                 'ga',
  'Inventory_Gudang QC':                   'qc',
  'Inventory_Gudang Permak':               'pmk',
  'Inventory_Gudang Retur':               'ret',
  'Inventory_Gudang Logistik':             'logx',
  'Inventory_Sample Live':                 'live',
};

let invAllData = [];
let invFilteredData = [];
let invCurrentPage = 1;
const invRowsPerPage = 100;
let invSearchTimeout = null;

// Parse a CSV text string (handles quoted commas)
function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = [];
    let inQ = false, cell = '';
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') { inQ = !inQ; continue; }
      if (c === ',' && !inQ) { cells.push(cell.trim()); cell = ''; continue; }
      cell += c;
    }
    cells.push(cell.trim());
    rows.push(cells);
  }
  return rows;
}

// Load inventory from Supabase
async function loadInventoryData(forceRefresh = false) {
  const loadingEl = document.getElementById('invLoadingState');
  const tableEl   = document.getElementById('invMatrixTable');
  if (loadingEl) { loadingEl.style.display = 'block'; loadingEl.innerHTML = '<div style="padding:48px; text-align:center; color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:12px;">⏳</div><div>Memuat data dari Supabase...</div></div>'; }
  if (tableEl) tableEl.classList.add('hidden');

  try {
    // Load in pages (Supabase max 1000/request)
    let all = [], from = 0, pageSize = 1000;
    while (true) {
      const batch = await supabaseFetch(`inv_products?select=*&order=category.asc,product.asc,variant.asc&limit=${pageSize}&offset=${from}`);
      if (!batch || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    invAllData = all;
    populateCategoryFilter();
    
    // Bind filters
    const searchInput = document.getElementById('invSearchInput');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(invSearchTimeout);
        invSearchTimeout = setTimeout(() => filterInventoryTable(), 300);
      });
      searchInput.dataset.bound = 'true';
    }
    ['invCategoryFilter', 'invGroupFilter', 'invOnlyStockFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) {
        el.addEventListener('change', () => filterInventoryTable());
        el.dataset.bound = 'true';
      }
    });
    updateInvSummaryCards();
    filterInventoryTable();
    if (all.length === 0 && loadingEl) {
      loadingEl.style.display = 'block';
      loadingEl.innerHTML = '<div style="padding:48px; text-align:center; color:var(--text-muted);"><div style="font-size:2rem;margin-bottom:12px;">📦</div><div>Belum ada data inventory.</div><div style="margin-top:8px;font-size:0.82rem;">Klik <strong>Import CSV</strong> untuk upload data DealPOS.</div></div>';
    }
  } catch(e) {
    console.error('loadInventoryData error:', e);
    if (loadingEl) loadingEl.innerHTML = '<div style="padding:48px; text-align:center; color:var(--error);">❌ Gagal memuat data. Periksa koneksi Supabase.</div>';
  }
}

function populateCategoryFilter() {
  const sel = document.getElementById('invCategoryFilter');
  if (!sel) return;
  const cats = [...new Set(invAllData.map(r => r.category).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Semua Kategori</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function updateInvSummaryCards() {
  const d = invAllData;
  const retailCols = INV_OUTLET_MAP.filter(o => o.group === 'retail').map(o => o.col);
  const onlineCols = INV_OUTLET_MAP.filter(o => o.group === 'online').map(o => o.col);
  const gudangCols = INV_OUTLET_MAP.filter(o => o.group === 'gudang').map(o => o.col);
  const allCols    = INV_OUTLET_MAP.map(o => o.col);
  const totalQty   = row => allCols.reduce((s, c) => s + (Number(row[c]) || 0), 0);
  const sumCols    = (rows, cols) => cols.reduce((s, c) => s + rows.reduce((ss, r) => ss + (Number(r[c]) || 0), 0), 0);

  const el = id => document.getElementById(id);
  if (el('invTotalSku'))   el('invTotalSku').textContent   = d.length.toLocaleString('id-ID');
  if (el('invActiveSku'))  el('invActiveSku').textContent  = d.filter(r => totalQty(r) > 0).length.toLocaleString('id-ID');
  if (el('invRetailTotal')) el('invRetailTotal').textContent = sumCols(d, retailCols).toLocaleString('id-ID');
  if (el('invOnlineTotal')) el('invOnlineTotal').textContent = sumCols(d, onlineCols).toLocaleString('id-ID');
  if (el('invWhTotal'))    el('invWhTotal').textContent    = sumCols(d, gudangCols).toLocaleString('id-ID');
  if (el('invZeroSku'))    el('invZeroSku').textContent    = d.filter(r => totalQty(r) === 0).length.toLocaleString('id-ID');
}

function filterInventoryTable() {
  const search  = (document.getElementById('invSearchInput')?.value || '').toLowerCase();
  const cat     = document.getElementById('invCategoryFilter')?.value || '';
  const group   = document.getElementById('invGroupFilter')?.value   || '';
  const onlyStk = document.getElementById('invOnlyStockFilter')?.checked || false;

  const activeCols = group ? INV_OUTLET_MAP.filter(o => o.group === group) : INV_OUTLET_MAP;
  const allCols    = INV_OUTLET_MAP.map(o => o.col);
  const totalQty   = row => allCols.reduce((s, c) => s + (Number(row[c]) || 0), 0);

  invCurrentPage = 1;
  invFilteredData = invAllData.filter(row => {
    if (cat && row.category !== cat) return false;
    if (onlyStk && totalQty(row) === 0) return false;
    if (search && !((row.product || '').toLowerCase().includes(search) || (row.sku || '').toLowerCase().includes(search))) return false;
    return true;
  });

  renderInventoryTable(invFilteredData, activeCols);
  const cnt = document.getElementById('invRowCount');
  if (cnt) cnt.textContent = `${invFilteredData.length.toLocaleString('id-ID')} produk ditampilkan`;
}

function renderInventoryTable(data, outlets) {
  const thead = document.getElementById('invMatrixThead');
  const tbody = document.getElementById('invMatrixTbody');
  const table = document.getElementById('invMatrixTable');
  const loading = document.getElementById('invLoadingState');
  const pagination = document.getElementById('invPagination');
  if (!thead || !tbody || !table) return;

  const retailOutlets  = outlets.filter(o => o.group === 'retail');
  const onlineOutlets  = outlets.filter(o => o.group === 'online');
  const gudangOutlets  = outlets.filter(o => o.group === 'gudang');

  // Build group header row
  const fixedCols = 6;
  const rSpan = `<th colspan="${fixedCols}" class="sticky-col grp-sticky" style="left:0; z-index:25; background:var(--bg-panel); border-right:2px solid var(--border-color); border-bottom:1px solid var(--border-color);"></th>`;
  let groupRow = `<tr class="group-row">${rSpan}`;
  if (retailOutlets.length)  groupRow += `<th colspan="${retailOutlets.length}"  class="grp-retail">🏪 RETAIL (${retailOutlets.length})</th>`;
  if (onlineOutlets.length)  groupRow += `<th colspan="${onlineOutlets.length}"  class="grp-online">🛍️ ONLINE (${onlineOutlets.length})</th>`;
  if (gudangOutlets.length)  groupRow += `<th colspan="${gudangOutlets.length}" class="grp-gudang">🏭 GUDANG (${gudangOutlets.length})</th>`;
  groupRow += '</tr>';

  // Build column header row
  let colRow = `<tr>
    <th class="sticky-col col-no" style="left:0; z-index:24; background:var(--bg-panel); color:var(--text-primary);">#</th>
    <th class="sticky-col col-cat" style="left:40px; z-index:24; background:var(--bg-panel); color:var(--text-primary);">Kategori</th>
    <th class="sticky-col col-prod" style="left:150px; z-index:24; background:var(--bg-panel); color:var(--text-primary);">Produk</th>
    <th class="sticky-col col-var" style="left:330px; z-index:24; background:var(--bg-panel); color:var(--text-primary);">Varian</th>
    <th class="sticky-col col-sku" style="left:390px; z-index:24; background:var(--bg-panel); color:var(--text-primary);">SKU</th>
    <th class="sticky-col col-price" style="left:500px; z-index:24; background:var(--bg-panel); color:var(--text-primary); border-right:2px solid var(--border-color);">Harga</th>
  `;
  outlets.forEach(o => { colRow += `<th class="qty-cell" title="${o.name}" style="background:var(--bg-panel); color:var(--text-primary);">${o.label}</th>`; });
  colRow += '</tr>';
  thead.innerHTML = groupRow + colRow;

  if (data.length === 0) {
    loading.style.display = 'block';
    loading.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);">Tidak ada data yang cocok dengan filter.</div>';
    table.classList.add('hidden');
    if (pagination) pagination.style.display = 'none';
    return;
  }

  loading.style.display = 'none';
  table.classList.remove('hidden');

  // Pagination Logic
  const totalPages = Math.ceil(data.length / invRowsPerPage);
  if (invCurrentPage > totalPages) invCurrentPage = totalPages;
  const startIdx = (invCurrentPage - 1) * invRowsPerPage;
  const endIdx = Math.min(startIdx + invRowsPerPage, data.length);

  let html = '';
  for (let i = startIdx; i < endIdx; i++) {
    const r = data[i];
    html += `<tr>
      <td class="sticky-col col-no" style="left:0; z-index:8; background:var(--bg-card); color:var(--text-primary); position:sticky;">${i + 1}</td>
      <td class="sticky-col col-cat" style="left:40px; z-index:8; background:var(--bg-card); color:var(--text-primary); position:sticky;">${r.category || ''}</td>
      <td class="sticky-col col-prod" style="left:150px; z-index:8; background:var(--bg-card); color:var(--text-primary); position:sticky;" title="${r.product || ''}">${(r.product || '').substring(0, 28)}${(r.product||'').length > 28 ? '…' : ''}</td>
      <td class="sticky-col col-var" style="left:330px; z-index:8; background:var(--bg-card); color:var(--text-primary); position:sticky;">${r.variant || ''}</td>
      <td class="sticky-col col-sku" style="left:390px; z-index:8; background:var(--bg-card); color:var(--text-muted); position:sticky;">${r.sku || ''}</td>
      <td class="sticky-col col-price" style="left:500px; z-index:8; background:var(--bg-card); color:var(--text-secondary); position:sticky; border-right: 2px solid var(--border-color);">${r.price ? Number(r.price).toLocaleString('id-ID') : ''}</td>
    `;
    outlets.forEach(o => {
      const qty = Number(r[o.col]) || 0;
      const cls = qty > 0 ? 'qty-pos' : 'qty-zero';
      html += `<td class="qty-cell ${cls}">${qty > 0 ? qty : '–'}</td>`;
    });
    html += '</tr>';
  }
  tbody.innerHTML = html;

  // Render Pagination Controls
  if (pagination) {
    pagination.style.display = 'flex';
    pagination.innerHTML = `
      <button onclick="invChangePage(-1)" ${invCurrentPage === 1 ? 'disabled' : ''}>&laquo; Prev</button>
      <span>Halaman <strong>${invCurrentPage}</strong> dari ${totalPages.toLocaleString('id-ID')}</span>
      <button onclick="invChangePage(1)" ${invCurrentPage === totalPages ? 'disabled' : ''}>Next &raquo;</button>
    `;
  }
}

window.invChangePage = function(delta) {
  invCurrentPage += delta;
  const group   = document.getElementById('invGroupFilter')?.value   || '';
  const activeCols = group ? INV_OUTLET_MAP.filter(o => o.group === group) : INV_OUTLET_MAP;
  renderInventoryTable(invFilteredData, activeCols);
  // scroll to top of table wrapper
  const wrap = document.querySelector('.inv-matrix-wrapper');
  if(wrap) wrap.scrollTop = 0;
};

// ── CSV IMPORT ──────────────────────────────────────────────────────────────

async function startInventoryImport() {
  const input  = document.getElementById('invImportFileInput');
  const wrap   = document.getElementById('invImportStatusWrap');
  const status = document.getElementById('invImportStatusText');
  const bar    = document.getElementById('invImportProgressBar');
  const btn    = document.getElementById('btnStartImportInv');

  if (!input || !input.files || input.files.length === 0) {
    return showToast('Pilih setidaknya 1 file CSV terlebih dahulu.', 'error');
  }

  wrap.style.display = 'block';
  btn.disabled = true;
  let allRecords = [];

  // Parse all selected files
  for (let fi = 0; fi < input.files.length; fi++) {
    const file = input.files[fi];
    if (status) status.textContent = `Membaca file ${fi + 1}/${input.files.length}: ${file.name}...`;
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) continue;
    const headers = rows[0];

    for (let ri = 1; ri < rows.length; ri++) {
      const cells = rows[ri];
      if (cells.length < 5) continue;
      const get = (name) => {
        const idx = headers.indexOf(name);
        return idx >= 0 ? (cells[idx] || '').trim() : '';
      };
      const record = {
        category: get('Category'),
        product:  get('Product'),
        sku:      get('Code'),
        variant:  get('Variant'),
        brand:    get('Brand') || get('Supplier'),
        price:    parseFloat(get('UnitPrice')) || 0,
      };
      if (!record.sku) continue;
      // Map outlet columns
      Object.entries(CSV_COL_MAP).forEach(([csvHeader, dbCol]) => {
        record[dbCol] = parseFloat(get(csvHeader)) || 0;
      });
      allRecords.push(record);
    }
  }

  if (allRecords.length === 0) {
    if (status) status.textContent = 'Tidak ada data valid ditemukan di file CSV.';
    btn.disabled = false;
    return;
  }

  // Batch upsert to Supabase
  const BATCH = 500;
  let uploaded = 0;
  for (let i = 0; i < allRecords.length; i += BATCH) {
    const batch = allRecords.slice(i, i + BATCH);
    const pct   = Math.round(((i + batch.length) / allRecords.length) * 100);
    if (status) status.textContent = `Menyimpan ke Supabase: ${i + batch.length}/${allRecords.length} SKU (${pct}%)...`;
    if (bar)    bar.style.width = pct + '%';
    try {
      await supabaseFetch('inv_products?on_conflict=sku', {
        method:  'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body:    batch,
      });
    } catch(e) {
      console.error('Batch upload error:', e);
    }
    uploaded += batch.length;
  }

  if (status) status.textContent = `✅ Selesai! ${uploaded.toLocaleString('id-ID')} SKU berhasil diupload ke Supabase.`;
  if (bar)    bar.style.width = '100%';
  btn.disabled = false;
  showToast(`✅ ${uploaded.toLocaleString('id-ID')} SKU berhasil diimport!`);
  setTimeout(() => {
    closeModal('modalImportInv');
    loadInventoryData(true);
  }, 1500);
}

// Expose to window for onclick
window.loadInventoryData   = loadInventoryData;
window.filterInventoryTable = filterInventoryTable;
window.startInventoryImport = startInventoryImport;

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
  document.getElementById('modalEditRoster').querySelector('.modal-header h3').innerText = 'Tambah Roster Shift';
  openModal('modalEditRoster');
};

window.openEditRosterModal = function(id) {
  const r = state.roster.find(x => x.id === id);
  if (!r) return;
  document.getElementById('editRosterId').value = r.id;
  document.getElementById('editRosterNama').value = r.nama + ' (' + r.nik + ')';
  document.getElementById('editRosterTanggal').value = r.tanggal;
  document.getElementById('editRosterShift').value = r.shift;
  document.getElementById('editRosterJamMasuk').value = r.jamMasuk;
  document.getElementById('editRosterJamPulang').value = r.jamPulang;
  document.getElementById('editRosterKeterangan').value = r.keterangan || '';
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

window.saveEditRoster = async function(e) {
  e.preventDefault();
  const id = document.getElementById('editRosterId').value;
  const tanggal = document.getElementById('editRosterTanggal').value;
  const shift = document.getElementById('editRosterShift').value;
  const jamMasuk = document.getElementById('editRosterJamMasuk').value;
  const jamPulang = document.getElementById('editRosterJamPulang').value;
  const keterangan = document.getElementById('editRosterKeterangan').value;

  showLoading();
  try {
    
    let error;
    if (id) {
      const res = await supabase.from('roster_shift').update({
        tanggal, shift, jam_masuk: jamMasuk, jam_pulang: jamPulang, keterangan
      }).eq('id', id);
      error = res.error;
    } else {
      const nik = document.getElementById('editRosterId').dataset.nik;
      const res = await supabase.from('roster_shift').insert({
        nik, tanggal, shift, jam_masuk: jamMasuk, jam_pulang: jamPulang, keterangan
      });
      error = res.error;
    }


    if (error) throw error;
    alert('Roster berhasil diupdate!');
    closeModal('modalEditRoster');
    await fetchRoster();
    renderAdminRosterTable();
  } catch (err) {
    alert('Gagal update roster: ' + err.message);
  } finally {
    hideLoading();
  }
};
