const GOOGLE_SHEET_WEB_APP_URL = 'PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';

const state = {
  currentUser: null,
  users: [],
  lembur: [],
  editingLemburId: null,
};

const loginPage = document.getElementById('loginPage');
const appPage = document.getElementById('appPage');
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');
const loggedUserLabel = document.getElementById('loggedUserLabel');
const logoutBtn = document.getElementById('logoutBtn');
const toast = document.getElementById('toast');

const overtimeForm = document.getElementById('overtimeForm');
const nikField = document.getElementById('nikField');
const namaField = document.getElementById('namaField');
const divisiField = document.getElementById('divisiField');
const tanggalField = document.getElementById('tanggalField');
const deskripsiField = document.getElementById('deskripsiField');
const jamMulaiField = document.getElementById('jamMulaiField');
const jamSelesaiField = document.getElementById('jamSelesaiField');
const totalJamField = document.getElementById('totalJamField');
const catatanField = document.getElementById('catatanField');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const statusTableWrap = document.getElementById('statusTableWrap');
const adminTableWrap = document.getElementById('adminTableWrap');
const userListWrap = document.getElementById('userListWrap');
const userForm = document.getElementById('userForm');
const userNIK = document.getElementById('userNIK');
const userName = document.getElementById('userName');
const userDivisi = document.getElementById('userDivisi');
const userUsername = document.getElementById('userUsername');
const userPassword = document.getElementById('userPassword');
const userRole = document.getElementById('userRole');
const resetUserFormBtn = document.getElementById('resetUserFormBtn');

const tabs = document.querySelectorAll('.tab-btn');
const panels = document.querySelectorAll('.tab-panel');
const adminTabButton = document.getElementById('adminTabButton');
const settingTabButton = document.getElementById('settingTabButton');

function calculateTotalHours(startTime, endTime) {
  if (!startTime || !endTime) return '';

  const start = new Date(`2024-01-01T${startTime}:00`);
  const end = new Date(`2024-01-01T${endTime}:00`);

  if (end <= start) {
    return 'Jam selesai harus lebih besar dari jam mulai';
  }

  const diffHours = (end - start) / (1000 * 60 * 60);
  return `${diffHours.toFixed(2)} jam`;
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

function setLoginMessage(message, type = '') {
  loginMessage.textContent = message;
  loginMessage.className = 'message-box';
  if (type) {
    loginMessage.classList.add(type);
  }
}

function clearFormData() {
  overtimeForm.reset();
  totalJamField.value = '';
  state.editingLemburId = null;
  cancelEditBtn.classList.add('hidden');
}

function switchTab(tabName) {
  tabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === tabName);
    panel.classList.toggle('hidden', panel.id !== tabName);
  });
}

async function apiRequest(action, payload = {}) {
  if (!GOOGLE_SHEET_WEB_APP_URL || GOOGLE_SHEET_WEB_APP_URL.includes('PASTE_')) {
    showToast('URL Apps Script belum diisi.', 'error');
    return null;
  }

  try {
    const body = new URLSearchParams({ action, ...payload }).toString();

    const response = await fetch(GOOGLE_SHEET_WEB_APP_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body,
    });

    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      result = { success: true, message: text };
    }

    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Request gagal');
    }

    return result;
  } catch (error) {
    showToast(error.message || 'Gagal menghubungi server.', 'error');
    return null;
  }
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function populateNIKOptions() {
  const allowedNIKs = state.currentUser.role === 'admin'
    ? state.users.map((user) => user.nik)
    : [state.currentUser.nik];

  nikField.innerHTML = '';

  allowedNIKs.forEach((nik) => {
    const option = document.createElement('option');
    option.value = nik;
    option.textContent = nik;
    nikField.appendChild(option);
  });

  if (allowedNIKs.includes(state.currentUser.nik)) {
    nikField.value = state.currentUser.nik;
  }

  if (allowedNIKs.length > 0) {
    updateUserFieldsFromNIK();
  }
}

function updateUserFieldsFromNIK() {
  const selectedNIK = nikField.value;
  const match = state.users.find((user) => user.nik === selectedNIK);

  if (!match) {
    namaField.value = state.currentUser?.nama || '';
    divisiField.value = state.currentUser?.divisi || '';
    return;
  }

  namaField.value = match.nama;
  divisiField.value = match.divisi;
}

function renderStatusTable() {
  const rows = state.lembur.filter((row) => {
    if (state.currentUser.role === 'admin') return true;
    return row.nik === state.currentUser.nik;
  });

  if (!rows.length) {
    statusTableWrap.innerHTML = '<p>Belum ada data lembur.</p>';
    return;
  }

  const table = `
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Deskripsi</th>
          <th>Jam</th>
          <th>Total</th>
          <th>Catatan</th>
          <th>Edited</th>
          <th>Updated By</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${formatDate(row.tanggal)}</td>
            <td>${row.deskripsi || '-'}</td>
            <td>${row.jamMulai || '-'} - ${row.jamSelesai || '-'}</td>
            <td>${row.totalJam || '-'}</td>
            <td>${row.catatan || '-'}</td>
            <td>${row.editedFlag === 'Ya' ? 'Ya' : 'Tidak'}</td>
            <td>${row.updatedBy || '-'}</td>
            <td class="action-cell">
              ${state.currentUser.role === 'admin' ? `<button class="action-btn edit" data-edit-id="${row.id}">Edit</button>` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  statusTableWrap.innerHTML = table;

  statusTableWrap.querySelectorAll('[data-edit-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = state.lembur.find((item) => item.id === button.dataset.editId);
      if (!row) return;
      fillEditForm(row);
      switchTab('formTab');
    });
  });
}

function renderAdminTable() {
  const rows = state.lembur;

  if (!rows.length) {
    adminTableWrap.innerHTML = '<p>Belum ada data lembur dari semua user.</p>';
    return;
  }

  const table = `
    <table>
      <thead>
        <tr>
          <th>NIK</th>
          <th>Nama</th>
          <th>Divisi</th>
          <th>Tanggal</th>
          <th>Deskripsi</th>
          <th>Total</th>
          <th>Edited</th>
          <th>Updated By</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.nik || '-'}</td>
            <td>${row.nama || '-'}</td>
            <td>${row.divisi || '-'}</td>
            <td>${formatDate(row.tanggal)}</td>
            <td>${row.deskripsi || '-'}</td>
            <td>${row.totalJam || '-'}</td>
            <td>${row.editedFlag === 'Ya' ? 'Ya' : 'Tidak'}</td>
            <td>${row.updatedBy || '-'}</td>
            <td class="action-cell">
              <button class="action-btn edit" data-admin-edit-id="${row.id}">Edit</button>
              <button class="action-btn delete" data-admin-delete-id="${row.id}">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  adminTableWrap.innerHTML = table;

  adminTableWrap.querySelectorAll('[data-admin-edit-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const row = state.lembur.find((item) => item.id === button.dataset.adminEditId);
      if (!row) return;
      fillEditForm(row);
      switchTab('formTab');
    });
  });

  adminTableWrap.querySelectorAll('[data-admin-delete-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      const result = await apiRequest('deleteLembur', { id: button.dataset.adminDeleteId });
      if (result) {
        showToast('Data lembur berhasil dihapus', 'success');
        await loadLembur();
      }
    });
  });
}

function renderUserTable() {
  const rows = state.users;

  if (!rows.length) {
    userListWrap.innerHTML = '<p>Belum ada data user.</p>';
    return;
  }

  const table = `
    <table>
      <thead>
        <tr>
          <th>NIK</th>
          <th>Nama</th>
          <th>Divisi</th>
          <th>Username</th>
          <th>Role</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${row.nik}</td>
            <td>${row.nama}</td>
            <td>${row.divisi}</td>
            <td>${row.username}</td>
            <td>${row.role}</td>
            <td class="action-cell">
              <button class="action-btn edit" data-user-edit-nik="${row.nik}">Edit</button>
              <button class="action-btn delete" data-user-delete-nik="${row.nik}">Hapus</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  userListWrap.innerHTML = table;

  userListWrap.querySelectorAll('[data-user-edit-nik]').forEach((button) => {
    button.addEventListener('click', () => {
      const user = state.users.find((item) => item.nik === button.dataset.userEditNik);
      if (!user) return;
      userNIK.value = user.nik;
      userName.value = user.nama;
      userDivisi.value = user.divisi;
      userUsername.value = user.username;
      userPassword.value = user.password;
      userRole.value = user.role;
    });
  });

  userListWrap.querySelectorAll('[data-user-delete-nik]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nikToDelete = button.dataset.userDeleteNik;
      if (nikToDelete === state.currentUser.nik) {
        showToast('Tidak bisa menghapus user yang sedang login.', 'error');
        return;
      }

      const result = await apiRequest('deleteUser', { nik: nikToDelete });
      if (result) {
        showToast('User berhasil dihapus', 'success');
        await loadUsers();
      }
    });
  });
}

async function loadUsers() {
  const result = await apiRequest('getUsers');
  if (!result) return;

  state.users = result.users || [];
  if (state.currentUser) {
    const current = state.users.find((user) => user.nik === state.currentUser.nik && user.username === state.currentUser.username);
    if (current) {
      state.currentUser = current;
    }
  }

  renderUserTable();

  if (state.currentUser) {
    populateNIKOptions();
  }
}

async function loadLembur() {
  const result = await apiRequest('getLembur', {
    nik: state.currentUser.role === 'admin' ? '' : state.currentUser.nik,
    role: state.currentUser.role,
  });

  if (!result) return;
  state.lembur = result.data || [];
  renderStatusTable();
  renderAdminTable();
}

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if (!username || !password) {
    setLoginMessage('Username dan password wajib diisi.', 'error');
    return;
  }

  const result = await apiRequest('login', {
    username,
    password,
  });

  if (!result || !result.user) {
    setLoginMessage('Login gagal. Username/password salah.', 'error');
    return;
  }

  state.currentUser = result.user;
  localStorage.setItem('currentUser', JSON.stringify(result.user));

  setLoginMessage('Login berhasil.', 'success');
  loginForm.reset();
  renderApp();
  await loadUsers();
  await loadLembur();
}

async function handleLogout() {
  state.currentUser = null;
  localStorage.removeItem('currentUser');
  appPage.classList.add('hidden');
  loginPage.classList.remove('hidden');
  clearFormData();
  setLoginMessage('', '');
}

function renderApp() {
  if (!state.currentUser) {
    loginPage.classList.remove('hidden');
    appPage.classList.add('hidden');
    return;
  }

  loginPage.classList.add('hidden');
  appPage.classList.remove('hidden');

  loggedUserLabel.textContent = `${state.currentUser.nama} (${state.currentUser.role})`;

  if (state.currentUser.role === 'admin') {
    adminTabButton.classList.remove('hidden');
    settingTabButton.classList.remove('hidden');
  } else {
    adminTabButton.classList.add('hidden');
    settingTabButton.classList.add('hidden');
  }

  switchTab('formTab');
  populateNIKOptions();
}

function fillEditForm(row) {
  state.editingLemburId = row.id;
  nikField.value = row.nik || '';
  namaField.value = row.nama || '';
  divisiField.value = row.divisi || '';
  tanggalField.value = row.tanggal || '';
  deskripsiField.value = row.deskripsi || '';
  jamMulaiField.value = row.jamMulai || '';
  jamSelesaiField.value = row.jamSelesai || '';
  totalJamField.value = row.totalJam || '';
  catatanField.value = row.catatan || '';
  cancelEditBtn.classList.remove('hidden');
}

function resetUserForm() {
  userForm.reset();
  userNIK.focus();
}

async function handleUserSave(event) {
  event.preventDefault();

  const payload = {
    nik: userNIK.value.trim(),
    nama: userName.value.trim(),
    divisi: userDivisi.value.trim(),
    username: userUsername.value.trim(),
    password: userPassword.value.trim(),
    role: userRole.value,
  };

  if (!payload.nik || !payload.nama || !payload.divisi || !payload.username || !payload.password) {
    showToast('Semua data user wajib diisi.', 'error');
    return;
  }

  const result = await apiRequest('saveUser', payload);
  if (!result) return;

  showToast('Data user berhasil disimpan', 'success');
  resetUserForm();
  await loadUsers();
}

function resetLemburForm() {
  clearFormData();
  if (state.currentUser && state.users.length) {
    const defaultNik = state.currentUser.role === 'admin' ? state.users[0].nik : state.currentUser.nik;
    nikField.value = defaultNik;
    updateUserFieldsFromNIK();
  }
}

async function handleLemburSubmit(event) {
  event.preventDefault();

  const payload = {
    id: state.editingLemburId || String(Date.now()),
    nik: nikField.value.trim(),
    nama: namaField.value.trim(),
    divisi: divisiField.value.trim(),
    tanggal: tanggalField.value,
    deskripsi: deskripsiField.value.trim(),
    jamMulai: jamMulaiField.value,
    jamSelesai: jamSelesaiField.value,
    totalJam: totalJamField.value,
    catatan: catatanField.value.trim(),
    status: 'Diajukan',
    editedFlag: state.editingLemburId ? 'Ya' : 'Tidak',
    updatedAt: new Date().toISOString(),
    updatedBy: state.currentUser.username,
  };

  if (!payload.nik || !payload.nama || !payload.divisi || !payload.tanggal || !payload.deskripsi || !payload.jamMulai || !payload.jamSelesai) {
    showToast('Semua field wajib diisi.', 'error');
    return;
  }

  const totalCheck = calculateTotalHours(payload.jamMulai, payload.jamSelesai);
  if (typeof totalCheck === 'string' && totalCheck.includes('harus lebih besar')) {
    showToast(totalCheck, 'error');
    return;
  }

  payload.totalJam = totalCheck;

  const result = await apiRequest('saveLembur', payload);
  if (!result) return;

  showToast(state.editingLemburId ? 'Data lembur berhasil diedit' : 'Data lembur berhasil disimpan', 'success');
  clearFormData();
  await loadLembur();
  resetLemburForm();
}

function wireEvents() {
  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  nikField.addEventListener('change', updateUserFieldsFromNIK);
  jamMulaiField.addEventListener('input', () => {
    totalJamField.value = calculateTotalHours(jamMulaiField.value, jamSelesaiField.value);
  });
  jamSelesaiField.addEventListener('input', () => {
    totalJamField.value = calculateTotalHours(jamMulaiField.value, jamSelesaiField.value);
  });

  overtimeForm.addEventListener('submit', handleLemburSubmit);
  cancelEditBtn.addEventListener('click', () => {
    clearFormData();
    resetLemburForm();
  });

  userForm.addEventListener('submit', handleUserSave);
  resetUserFormBtn.addEventListener('click', resetUserForm);
}

async function bootstrap() {
  wireEvents();

  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      state.currentUser = JSON.parse(savedUser);
      renderApp();
      await loadUsers();
      await loadLembur();
    } catch (error) {
      localStorage.removeItem('currentUser');
      state.currentUser = null;
      renderApp();
    }
  } else {
    renderApp();
  }
}

bootstrap();
