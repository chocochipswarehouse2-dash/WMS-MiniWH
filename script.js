const GOOGLE_SHEET_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbziFOC_LS6O4jc7-3RcMmkoD5ncs6-FrEIn30nuwJd-HMCkYN1lRpE_ON_yBUgk5QHq/exec";

const state = { currentUser: null, users: [], lembur: [], cuti: [] };

const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById('themeToggleBtn');
const toast = document.getElementById('toast');

const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');

function showToast(msg, type = 'success') {
  toast.textContent = msg; toast.className = `toast ${type}`; toast.classList.remove('hidden');
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function switchTab(tabId) {
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  panels.forEach(p => p.classList.toggle('active', p.id === tabId));
  panels.forEach(p => p.classList.toggle('hidden', p.id !== tabId));
}

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

// ================= THEME (DARK / LIGHT MODE) =================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
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
    <label><span>Alasan / Keterangan</span><input type="text" class="c_alasan" placeholder="Cth: Acara keluarga" required/></label>
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
    const tStart = new Date(`2000-01-01T${mulai}:00`);
    const tEnd = new Date(`2000-01-01T${selesai}:00`);
    let totalJam = ((tEnd - tStart) / (1000 * 60 * 60)).toFixed(2);
    if(totalJam < 0) totalJam = '0.00';

    return {
      nik, nama: document.getElementById('l_nama').value, divisi: document.getElementById('l_divisi').value,
      tanggal: row.querySelector('.l_tanggal').value,
      deskripsi: row.querySelector('.l_deskripsi').value,
      jamMulai: mulai, jamSelesai: selesai, totalJam: `${totalJam} jam`,
      updatedBy: state.currentUser.username
    };
  });

  const res = await apiRequest('saveLemburMultiple', { lemburList });
  if (res) {
    showToast('Lembur berhasil diajukan!');
    lemburContainer.innerHTML = ''; addLemburRow();
    loadLembur(); switchTab('statusLemburTab');
  }
});

document.getElementById('cutiForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nik = document.getElementById('c_nik').value;
  const rows = Array.from(cutiContainer.querySelectorAll('.dynamic-row'));
  if (rows.length === 0) return showToast('Tambahkan minimal 1 baris Ijin/Cuti!', 'error');

  const perijinanList = rows.map(row => ({
    nik, nama: document.getElementById('c_nama').value, divisi: document.getElementById('c_divisi').value,
    jenis: row.querySelector('.c_jenis').value, alasan: row.querySelector('.c_alasan').value,
    tanggalMulai: row.querySelector('.c_tglMulai').value, tanggalSelesai: row.querySelector('.c_tglSelesai').value,
    updatedBy: state.currentUser.username
  }));

  const res = await apiRequest('savePerijinanMultiple', { perijinanList });
  if (res) {
    showToast('Ijin/Cuti berhasil diajukan!');
    cutiContainer.innerHTML = ''; addCutiRow();
    loadCuti(); switchTab('statusCutiTab');
  }
});

// ================= RENDER TABLES =================
function renderStatusBadge(status) {
  const s = String(status || '').toLowerCase();
  if(s === 'disetujui') return `<span class="status disetujui">Disetujui</span>`;
  if(s === 'ditolak') return `<span class="status ditolak">Ditolak</span>`;
  return `<span class="status diajukan">Diajukan</span>`;
}

function formatDate(val) {
  if(!val) return '-';
  return val;
}

function renderLemburTables() {
  const saya = state.lembur.filter(r => state.currentUser.role === 'admin' || r.nik === state.currentUser.nik);
  
  const genRows = (data, isAdmin) => data.map(r => `
    <tr>
      ${isAdmin ? `<td>${r.nik}<br><small>${r.nama}</small></td>` : ''}
      <td>${formatDate(r.tanggal)}</td>
      <td><strong>${r.deskripsi || '-'}</strong></td>
      <td>${r.jamMulai} - ${r.jamSelesai} (${r.totalJam})</td>
      <td>${renderStatusBadge(r.status)}</td>
      <td><button class="action-btn delete" onclick="deleteLembur('${r.id}')">Hapus</button></td>
    </tr>
  `).join('');

  document.getElementById('statusLemburTableWrap').innerHTML = `
    <table><thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Detail Jam</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${genRows(saya, false)}</tbody></table>
  `;

  if(state.currentUser.role === 'admin') {
    document.getElementById('adminLemburTableWrap').innerHTML = `
      <table><thead><tr><th>User</th><th>Tanggal</th><th>Deskripsi</th><th>Detail Jam</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${genRows(state.lembur, true)}</tbody></table>
    `;
  }
}

function renderCutiTables() {
  const saya = state.cuti.filter(r => state.currentUser.role === 'admin' || r.nik === state.currentUser.nik);
  
  const genRows = (data, isAdmin) => data.map(r => `
    <tr>
      ${isAdmin ? `<td>${r.nik}<br><small>${r.nama}</small></td>` : ''}
      <td>${r.jenis}</td>
      <td>${formatDate(r.tanggalMulai)} s/d ${formatDate(r.tanggalSelesai)}</td>
      <td>${r.alasan}</td>
      <td>${renderStatusBadge(r.status)}</td>
      <td class="action-cell">
        ${isAdmin && r.status === 'Diajukan' ? `
          <button class="action-btn approve" onclick="approveCuti('${r.id}')">Setuju</button>
          <button class="action-btn reject" onclick="rejectCuti('${r.id}')">Tolak</button>
        ` : ''}
        <button class="action-btn delete" onclick="deleteCuti('${r.id}')">Hapus</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('statusCutiTableWrap').innerHTML = `
    <table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${genRows(saya, false)}</tbody></table>
  `;

  if(state.currentUser.role === 'admin') {
    document.getElementById('adminCutiTableWrap').innerHTML = `
      <table><thead><tr><th>User</th><th>Jenis</th><th>Tanggal</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead>
      <tbody>${genRows(state.cuti, true)}</tbody></table>
    `;
  }
}

window.deleteLembur = async (id) => {
  if(confirm('Hapus lembur ini?')) {
    await apiRequest('deleteLembur', { id }); loadLembur();
  }
};
window.deleteCuti = async (id) => {
  if(confirm('Hapus perijinan ini?')) {
    await apiRequest('deletePerijinan', { id }); loadCuti();
  }
};
window.approveCuti = async (id) => {
  await apiRequest('approvePerijinan', { id, adminUsername: state.currentUser.username }); loadCuti();
};
window.rejectCuti = async (id) => {
  await apiRequest('rejectPerijinan', { id, adminUsername: state.currentUser.username }); loadCuti();
};

async function loadLembur() {
  const res = await apiRequest('getLembur', { nik: state.currentUser.role==='admin' ? '' : state.currentUser.nik, role: state.currentUser.role });
  if(res) { state.lembur = res.data || []; renderLemburTables(); }
}
async function loadCuti() {
  const res = await apiRequest('getPerijinan', { nik: state.currentUser.role==='admin' ? '' : state.currentUser.nik, role: state.currentUser.role });
  if(res) { state.cuti = res.data || []; renderCutiTables(); }
}

function syncUserFields(selectId, namaId, divId) {
  const select = document.getElementById(selectId);
  if(state.currentUser.role !== 'admin') {
    select.innerHTML = `<option value="${state.currentUser.nik}">${state.currentUser.nik} - ${state.currentUser.nama}</option>`;
    select.disabled = true;
    document.getElementById(namaId).value = state.currentUser.nama;
    document.getElementById(divId).value = state.currentUser.divisi;
  } else {
    select.disabled = false;
    select.innerHTML = state.users.map(u => `<option value="${u.nik}">${u.nik} - ${u.nama}</option>`).join('');
    select.onchange = () => {
      const u = state.users.find(x => x.nik === select.value);
      if(u) { document.getElementById(namaId).value = u.nama; document.getElementById(divId).value = u.divisi; }
    };
    if(state.users.length) select.dispatchEvent(new Event('change'));
  }
}

async function startApp() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('appPage').classList.remove('hidden');
  document.getElementById('loggedUserLabel').textContent = `${state.currentUser.nama} (${state.currentUser.role})`;
  
  if (state.currentUser.role === 'admin') {
    document.getElementById('adminLemburTabBtn').classList.remove('hidden');
    document.getElementById('adminCutiTabBtn').classList.remove('hidden');
    document.getElementById('settingTabBtn').classList.remove('hidden');
  }

  const usrRes = await apiRequest('getUsers');
  if(usrRes) state.users = usrRes.users || [];
  
  syncUserFields('l_nik', 'l_nama', 'l_divisi');
  syncUserFields('c_nik', 'c_nama', 'c_divisi');
  
  if(lemburContainer.children.length === 0) addLemburRow();
  if(cutiContainer.children.length === 0) addCutiRow();

  loadLembur(); loadCuti();
  switchTab('formLemburTab');
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const res = await apiRequest('login', { 
    username: document.getElementById('loginUsername').value, 
    password: document.getElementById('loginPassword').value 
  });
  if(res && res.user) {
    state.currentUser = res.user;
    localStorage.setItem('currentUser', JSON.stringify(res.user));
    startApp();
  } else {
    const msg = document.getElementById('loginMessage');
    msg.textContent = 'Kredensial atau password salah!';
    msg.style.color = 'red';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('currentUser'); location.reload();
});

tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
initTheme();
const savedUser = localStorage.getItem('currentUser');
if(savedUser) { state.currentUser = JSON.parse(savedUser); startApp(); }