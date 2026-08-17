const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbziFOC_LS6O4jc7-3RcMmkoD5ncs6-FrEIn30nuwJd-HMCkYN1lRpE_ON_yBUgk5QHq/exec";

const state = { currentUser: null, users: [], lembur: [], cuti: [] };

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
  formLemburTab: 'Input Lembur',
  statusLemburTab: 'Status Lembur',
  formCutiTab: 'Input Ijin / Cuti',
  statusCutiTab: 'Status Ijin / Cuti',
  adminLemburTab: 'Admin Rekap Semua Lembur',
  adminCutiTab: 'Approval & Kelola Ijin / Cuti',
  settingTab: 'Kelola Data User & Karyawan'
};

function showToast(msg, type = 'success') {
  toast.textContent = msg; 
  toast.className = `toast ${type}`; 
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function switchTab(tabId) {
  navItems.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  panels.forEach(p => p.classList.toggle('active', p.id === tabId));
  panels.forEach(p => p.classList.toggle('hidden', p.id !== tabId));
  
  if (topbarPageTitle && tabTitles[tabId]) {
    topbarPageTitle.textContent = tabTitles[tabId];
  }

  // Close sidebar on mobile when tab is clicked
  if (window.innerWidth <= 900) {
    closeMobileSidebar();
  }
}

// ================= SIDEBAR TOGGLE =================
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

// ================= API REQUEST =================
async function apiRequest(action, payload = {}) {
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

// ================= OVERTIME HELPER =================
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

// ================= DYNAMIC FORMS =================
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
    <label><span>Alasan / Keterangan</span><input type="text" class="c_alasan" placeholder="Cth: Acara keluarga, cek kesehatan" required/></label>
    <label><span>Tanggal Mulai</span><input type="date" class="c_tglMulai" required/></label>
    <label><span>Tanggal Selesai</span><input type="date" class="c_tglSelesai" required/></label>
  `;
  cutiContainer.appendChild(div);
}
document.getElementById('addCutiRowBtn').addEventListener('click', addCutiRow);

// ================= SUBMIT HANDLING =================
document.getElementById('lemburForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nik = document.getElementById('l_nik').value;
  const rows = Array.from(lemburContainer.querySelectorAll('.dynamic-row'));
  if (rows.length === 0) return showToast('Tambahkan minimal 1 baris lembur!', 'error');

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
  const nik = document.getElementById('c_nik').value;
  const rows = Array.from(cutiContainer.querySelectorAll('.dynamic-row'));
  if (rows.length === 0) return showToast('Tambahkan minimal 1 baris Ijin/Cuti!', 'error');

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
  if (res) {
    showToast('Ijin/Cuti berhasil diajukan! Notifikasi dikirim.');
    cutiContainer.innerHTML = ''; 
    addCutiRow();
    loadCuti(); 
    switchTab('statusCutiTab');
  }
});

// ================= RENDER TABLES =================
function renderStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'disetujui' || s === 'selesai') return `<span class="status disetujui">${status}</span>`;
  if (s === 'ditolak') return `<span class="status ditolak">Ditolak</span>`;
  return `<span class="status diajukan">Diajukan</span>`;
}

function formatDate(val) {
  if (!val) return '-';
  return val;
}

function renderLemburTables() {
  const saya = state.lembur.filter(r => state.currentUser.role === 'admin' || r.nik === state.currentUser.nik);
  
  const genRows = (data, isAdmin) => {
    if (!data.length) {
      return `<tr><td colspan="${isAdmin ? 8 : 7}" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada data lembur yang tercatat.</td></tr>`;
    }
    return data.map(r => `
      <tr>
        ${isAdmin ? `<td><strong>${r.nik}</strong><br><small>${r.nama}</small></td>` : ''}
        <td><span class="mono-text">${formatDate(r.tanggal)}</span></td>
        <td><strong>${r.deskripsi || r.deskripsiPekerjaan || r.keterangan || r.pekerjaan || '-'}</strong></td>
        <td><span class="mono-text">${r.jamMulai || '-'}</span></td>
        <td><span class="mono-text">${r.jamSelesai || '-'}</span></td>
        <td><span class="mono-text">${r.totalJam || '-'}</span></td>
        <td>${r.catatan || '-'}</td>
        <td class="action-cell">
          <button class="action-btn edit" onclick="openEditLembur('${r.id}')">Edit</button>
          <button class="action-btn delete" onclick="deleteLembur('${r.id}')">Hapus</button>
        </td>
      </tr>
    `).join('');
  };

  document.getElementById('statusLemburTableWrap').innerHTML = `
    <table>
      <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Jam Mulai</th><th>Jam Selesai</th><th>Total Jam</th><th>Catatan</th><th>Aksi</th></tr></thead>
      <tbody>${genRows(saya, false)}</tbody>
    </table>
  `;

  if (state.currentUser.role === 'admin') {
    document.getElementById('adminLemburTableWrap').innerHTML = `
      <table>
        <thead><tr><th>User</th><th>Tanggal</th><th>Deskripsi</th><th>Jam Mulai</th><th>Jam Selesai</th><th>Total Jam</th><th>Catatan</th><th>Aksi</th></tr></thead>
        <tbody>${genRows(state.lembur, true)}</tbody>
      </table>
    `;
  }
}

function renderCutiTables() {
  const saya = state.cuti.filter(r => state.currentUser.role === 'admin' || r.nik === state.currentUser.nik);
  
  // Find admin contact for WA link from User side
  const adminUser = state.users.find(u => u.role === 'admin' && (u.noHp || u.nohp));
  const adminPhone = adminUser ? formatWaNumber(adminUser.noHp || adminUser.nohp) : '';

  const genRows = (data, isAdmin) => {
    if (!data.length) {
      return `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align:center; padding: 24px; color: var(--text-muted);">Belum ada data pengajuan ijin/cuti.</td></tr>`;
    }
    return data.map(r => {
      // Find employee contact for Admin WA link
      const empUser = state.users.find(u => String(u.nik) === String(r.nik));
      const empPhone = empUser ? formatWaNumber(empUser.noHp || empUser.nohp) : '';

      // WA link to Admin (from employee)
      const userWaMsg = encodeURIComponent(`Halo Admin, saya telah mengajukan ${r.jenis} untuk periode ${r.tanggalMulai} s/d ${r.tanggalSelesai}. Alasan: ${r.alasan}. Mohon konfirmasi dan persetujuannya. Terima kasih.`);
      const waAdminBtn = adminPhone ? `<a class="action-btn wa" href="https://wa.me/${adminPhone}?text=${userWaMsg}" target="_blank" title="Kirim WA ke Admin">📲 WA Admin</a>` : '';

      // WA link to Employee (from admin)
      const adminWaMsg = encodeURIComponent(`Halo ${r.nama}, terkait pengajuan ${r.jenis} periode ${r.tanggalMulai} s/d ${r.tanggalSelesai}, status pengajuan saat ini: [${r.status || 'Diajukan'}]. Terima kasih.`);
      const waEmpBtn = empPhone ? `<a class="action-btn wa" href="https://wa.me/${empPhone}?text=${adminWaMsg}" target="_blank" title="Kirim WA ke Karyawan">📲 WA</a>` : '';

      return `
        <tr>
          ${isAdmin ? `<td><strong>${r.nik}</strong><br><small>${r.nama}</small></td>` : ''}
          <td><strong>${r.jenis}</strong></td>
          <td><span class="mono-text">${formatDate(r.tanggalMulai)} s/d ${formatDate(r.tanggalSelesai)}</span></td>
          <td>${r.alasan}</td>
          <td>${renderStatusBadge(r.status)}</td>
          <td class="action-cell">
            ${isAdmin ? `<button class="action-btn edit" onclick="openEditCuti('${r.id}')">Edit & Status</button>` : ''}
            ${isAdmin ? waEmpBtn : waAdminBtn}
            <button class="action-btn delete" onclick="deleteCuti('${r.id}')">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');
  };

  document.getElementById('statusCutiTableWrap').innerHTML = `
    <table>
      <thead><tr><th>Jenis</th><th>Tanggal</th><th>Alasan</th><th>Status</th><th>Aksi / Notif</th></tr></thead>
      <tbody>${genRows(saya, false)}</tbody>
    </table>
  `;

  if (state.currentUser.role === 'admin') {
    document.getElementById('adminCutiTableWrap').innerHTML = `
      <table>
        <thead><tr><th>User</th><th>Jenis</th><th>Tanggal</th><th>Alasan</th><th>Status</th><th>Aksi / Notif</th></tr></thead>
        <tbody>${genRows(state.cuti, true)}</tbody>
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
          <th>Email</th>
          <th>No. HP / WA</th>
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
            <td>${u.email ? `<span class="mono-text">${u.email}</span>` : '<span style="color:var(--text-muted)">-</span>'}</td>
            <td>${u.noHp ? `<span class="mono-text">${u.noHp}</span>` : '<span style="color:var(--text-muted)">-</span>'}</td>
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
  if (res) {
    showToast('Data perijinan diperbarui & notifikasi dikirim!');
    closeModal('editCutiModal');
    loadCuti();
  }
});

window.deleteLembur = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus data lembur ini?')) {
    await apiRequest('deleteLembur', { id }); 
    loadLembur();
  }
};

window.deleteCuti = async (id) => {
  if (confirm('Apakah Anda yakin ingin menghapus data perijinan ini?')) {
    await apiRequest('deletePerijinan', { id }); 
    loadCuti();
  }
};

window.editUser = (nik) => {
  const u = state.users.find(x => x.nik === nik);
  if (!u) return;
  document.getElementById('userEditMode').value = "true";
  document.getElementById('userNIK').value = u.nik;
  document.getElementById('userName').value = u.nama;
  document.getElementById('userDivisi').value = u.divisi;
  document.getElementById('userUsername').value = u.username;
  document.getElementById('userPassword').value = u.password;
  document.getElementById('userEmail').value = u.email || '';
  document.getElementById('userNoHp').value = u.noHp || u.nohp || '';
  document.getElementById('userRole').value = u.role || 'user';
  
  const formTitle = document.getElementById('userFormTitle');
  if (formTitle) formTitle.textContent = `Edit User - ${u.nama} (${u.nik})`;
  
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
  const payload = {
    nik: document.getElementById('userNIK').value.trim(),
    nama: document.getElementById('userName').value.trim(),
    divisi: document.getElementById('userDivisi').value.trim(),
    username: document.getElementById('userUsername').value.trim(),
    password: document.getElementById('userPassword').value.trim(),
    email: document.getElementById('userEmail').value.trim(),
    noHp: document.getElementById('userNoHp').value.trim(),
    role: document.getElementById('userRole').value
  };

  const res = await apiRequest('saveUser', payload);
  if (res) {
    showToast('User berhasil disimpan!');
    document.getElementById('userForm').reset();
    document.getElementById('userEditMode').value = "false";
    const formTitle = document.getElementById('userFormTitle');
    if (formTitle) formTitle.textContent = 'Tambah / Edit User';
    loadUsersData();
  }
});

document.getElementById('resetUserFormBtn').addEventListener('click', () => {
  document.getElementById('userForm').reset();
  document.getElementById('userEditMode').value = "false";
  const formTitle = document.getElementById('userFormTitle');
  if (formTitle) formTitle.textContent = 'Tambah / Edit User';
});

// ================= PDF EXPORT =================
function exportPdf(isAdmin) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Library PDF belum siap, silakan refresh halaman.', 'error');
    return;
  }

  const rows = isAdmin ? state.lembur : state.lembur.filter(r => r.nik === state.currentUser.nik);
  const doc = new window.jspdf.jsPDF();
  const filename = isAdmin ? 'rekap-lembur-admin.pdf' : 'rekap-lembur-saya.pdf';

  doc.setFontSize(16);
  doc.text(isAdmin ? 'Rekap Semua Lembur (Admin)' : 'Rekap Lembur Saya', 14, 20);

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
  const res = await apiRequest('getPerijinan', { 
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik, 
    role: state.currentUser.role 
  });
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
    document.getElementById(namaId).value = state.currentUser.nama;
    document.getElementById(divId).value = state.currentUser.divisi;
  } else {
    select.disabled = false;
    select.innerHTML = state.users.map(u => `<option value="${u.nik}">${u.nik} - ${u.nama}</option>`).join('');
    select.onchange = () => {
      const u = state.users.find(x => x.nik === select.value);
      if (u) { 
        document.getElementById(namaId).value = u.nama; 
        document.getElementById(divId).value = u.divisi; 
      }
    };
    if (state.users.length && !select.value) select.dispatchEvent(new Event('change'));
  }
}

async function startApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  
  // User Labels
  document.getElementById('loggedUserLabel').textContent = `${state.currentUser.nama} (${state.currentUser.role})`;
  const sidebarName = document.getElementById('sidebarUserName');
  const sidebarRole = document.getElementById('sidebarUserRole');
  if (sidebarName) sidebarName.textContent = state.currentUser.nama;
  if (sidebarRole) sidebarRole.textContent = `${state.currentUser.divisi} • ${state.currentUser.role}`;
  
  // Role Access Admin Navigation Group
  const adminGroup = document.getElementById('adminNavGroup');
  if (state.currentUser.role === 'admin') {
    if (adminGroup) adminGroup.classList.remove('hidden');
  } else {
    if (adminGroup) adminGroup.classList.add('hidden');
  }

  await loadUsersData();
  
  if (lemburContainer.children.length === 0) addLemburRow();
  if (cutiContainer.children.length === 0) addCutiRow();

  loadLembur(); 
  loadCuti();
  switchTab('formLemburTab');
}

// ================= AUTH EVENTS =================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await apiRequest('login', { 
    username: document.getElementById('loginUsername').value, 
    password: document.getElementById('loginPassword').value 
  });
  if (res && res.user) {
    state.currentUser = res.user;
    localStorage.setItem('currentUser', JSON.stringify(res.user));
    startApp();
  } else {
    const msg = document.getElementById('loginMessage');
    msg.textContent = 'Username/NIK atau password salah!';
    msg.style.color = 'var(--error)';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('currentUser'); 
  location.reload();
});

// Sidebar navigation clicks
navItems.forEach(item => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

initTheme();

const savedUser = localStorage.getItem('currentUser');
if (savedUser) { 
  state.currentUser = JSON.parse(savedUser); 
  startApp(); 
}